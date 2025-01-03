import Queue from "../structs/queue";

interface ReceiptData {
  storeName: string;
  storeAddress: string;
  storeNumber: string;
  datePurchased: string;
  taxAmount: number;
  totalAmount: number;
  items: Item[];
  totalItemsCount: number;
  processingError?: string | null;
}

interface Item {
  itemNumber: number;
  name: string;
  price: number;
  unitQuantity: number;
  unitPrice?: number;
  type?: string;
  confidence?: number;
  shouldDraftItem?: boolean;
}

interface ParsedItem {
  itemNumber: number;
  name: string;
  type?: string;
  unitQuantity?: number;
  unitPrice?: number;
}

interface ParserState {
  itemQueue: Queue<ParsedItem>;
  priceQueue: Queue<number>;
  currentItem: Partial<ParsedItem> | null;
  expectedNextItemNumber: number;
  debug?: boolean;
}

const ITEM_TYPES = ["F", "FW", "W", "T", "HQ", "Q", "H", "TF"];

const isPrice = (line: string): boolean => {
  return /^-?\d+\.\d{2}(\s+H|\s+HQ|\s+Q)?$/.test(line.trim());
};

const isItemStart = (line: string): boolean => {
  const trimmed = line.trim();
  // Check if line starts with the expected item number
  // OR if it's a continuation line (starts with uppercase letters) when we have a pending item
  return /^\d+\s+\d*\s*[A-Z]/.test(trimmed) || /^[A-Z]/.test(trimmed);
};

const isStandaloneNumber = (line: string): boolean => {
  return /^[1-9][0-9]?$/.test(line.trim());
};

const parseItemNumber = (line: string): number => {
  // Handle standalone number case
  if (isStandaloneNumber(line)) {
    return parseInt(line.trim());
  }
  // Handle inline number case (number followed by description)
  const match = line.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : 0;
};

const parsePrice = (line: string): number => {
  const match = line.match(/-?(\d+\.\d{2})/);
  return match ? parseFloat(match[1]) : 0;
};

const parseUnitPricing = (
  line: string
): { unitQuantity: number; unitPrice: number } | null => {
  // Match patterns like "2 Ea. @ 1/1.62" or "3 Ea. @1/ 1.00"
  const match = line.trim().match(/(\d+)\s*Ea\.\s*@\s*\d+\s*\/\s*(\d+\.?\d*)/i);

  if (match) {
    return {
      unitQuantity: parseInt(match[1]),
      unitPrice: parseFloat(match[2]),
    };
  }

  return null;
};

const isUnitPricingLine = (line: string): boolean => {
  return /\d+\s*Ea\.\s*@.*\/.*\d/.test(line.trim());
};

const parseType = (line: string): string | undefined => {
  const trimmed = line.trim();
  if (ITEM_TYPES.includes(trimmed)) {
    return trimmed;
  }
  for (const type of ITEM_TYPES) {
    if (trimmed.endsWith(` ${type}`)) {
      return type;
    }
  }
  return undefined;
};

const shouldStopProcessing = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed.includes("*****") ||
    trimmed.includes("ITEMS PURCHASED") ||
    /\*{5,}/.test(trimmed)
  );
};

const shouldSkipLine = (line: string): boolean => {
  const trimmed = line.trim();
  const skipPatterns = [
    /^DC\s/,
    /Special Today/,
    /FREE\/COUPON/,
    /Reduced Item/,
    /DIGITAL COUPON/,
    /FSA Subtotal/,
    /YOU SAVED/,
    /OUR BRAND SAVINGS/,
    /DEBIT/,
    /^\s*$/,
    /^Total Sale$/,
    /^ITEMS PURCHASED:/,
    /^[*]+$/,
  ];
  return skipPatterns.some((pattern) => pattern.test(trimmed));
};

interface CleanedItemResult {
  name: string;
  type?: string;
  price?: number;
}

const cleanItemName = (name: string): CleanedItemResult => {
  let cleanedName = name;
  let detectedType: string | undefined;
  let detectedPrice: number | undefined;
  // Extract price at end if it exists
  const priceMatch = cleanedName.match(/\s+(\d+\.\d{2})\s*$/);
  if (priceMatch) {
    detectedPrice = parseFloat(priceMatch[1]);
    cleanedName = cleanedName.replace(/\s+\d+\.\d{2}\s*$/, "");
  }

  detectedType = parseType(cleanedName);
  if (detectedType) {
    const lastSpaceIndex = cleanedName.lastIndexOf(" ");
    cleanedName =
      lastSpaceIndex !== -1
        ? cleanedName.substring(0, lastSpaceIndex)
        : cleanedName;
  }

  return {
    name: cleanedName.trim(),
    type: detectedType,
    price: detectedPrice,
  };
};

function calculateConfidence(item: Item): number {
  let confidence = 0.95;

  if (item.price === 0 || item.price > 100) {
    confidence *= 0.7;
  }

  if (item.name.length < 3 || item.name.length > 50) {
    confidence *= 0.8;
  }

  if (item.unitPrice && item.unitQuantity) {
    const expectedPrice = Number(
      (item.unitPrice * item.unitQuantity).toFixed(2)
    );
    if (Math.abs(expectedPrice - item.price) > 0.01) {
      confidence *= 0.7;
    }
  }

  return Number(confidence.toFixed(2));
}

function getItemCount(lines: string[]): number {
  const itemLine = lines.find((line) => line.startsWith("ITEMS PURCHASED:"));
  if (!itemLine) return 0;

  const match = itemLine.match(/ITEMS PURCHASED: (\d+)/);
  return match ? parseInt(match[1]) : 0;
}

const processLine = (state: ParserState, line: string): boolean => {
  if (state.debug) {
    console.log("\nProcessing line:", line);
    console.log("Expected next item number:", state.expectedNextItemNumber);
  }

  // Skip processing termination lines
  if (shouldStopProcessing(line)) return false;
  if (shouldSkipLine(line)) return true;

  // Handle standalone number
  if (isStandaloneNumber(line)) {
    const number = parseInt(line);
    // Accept any valid item number
    if (state.currentItem?.itemNumber && state.currentItem?.name) {
      state.itemQueue.enqueue(state.currentItem as ParsedItem);
    }
    state.currentItem = { itemNumber: number, name: "" };
    state.expectedNextItemNumber = number + 1;
    return true;
  }
  if (isUnitPricingLine(line) && state.currentItem) {
    const unitInfo = parseUnitPricing(line);
    if (unitInfo) {
      state.currentItem.unitQuantity = unitInfo.unitQuantity;
      state.currentItem.unitPrice = unitInfo.unitPrice;
    }
    return true;
  }

  // Handle price
  if (isPrice(line)) {
    const price = parsePrice(line);
    state.priceQueue.enqueue(price);
    return true;
  }

  // Handle new item or item continuation
  if (isItemStart(line)) {
    const itemNumber = parseItemNumber(line);
    const startsWithNumber = /^\d+/.test(line);
    if (!startsWithNumber && state.currentItem?.itemNumber) {
      // This is a continuation of a standalone number
      const cleaned = cleanItemName(line);

      if (!state.currentItem.name) state.currentItem.name = cleaned.name;
      if (!state.currentItem.type) state.currentItem.type = cleaned.type;
      if (cleaned.price) state.priceQueue.enqueue(cleaned.price);
    } else if (itemNumber > 0) {
      // Accept any valid item number
      // New item
      if (state.currentItem?.itemNumber && state.currentItem?.name) {
        state.itemQueue.enqueue(state.currentItem as ParsedItem);
      }

      const cleaned = cleanItemName(line.replace(/^\d+\s+/, ""));
      state.currentItem = {
        itemNumber: itemNumber,
        name: cleaned.name,
        type: cleaned.type,
      };
      if (cleaned.price) state.priceQueue.enqueue(cleaned.price);
      state.expectedNextItemNumber++;
    }
    return true;
  }

  return true;
};

const parseReceiptItems = (lines: string[], debug: boolean = false): Item[] => {
  const state: ParserState = {
    itemQueue: new Queue<ParsedItem>(100),
    priceQueue: new Queue<number>(100),
    currentItem: null,
    expectedNextItemNumber: 1,
    debug,
  };

  // Process all lines
  for (const line of lines) {
    const shouldContinue = processLine(state, line);
    if (!shouldContinue) break;
  }

  // Handle last item
  if (state.currentItem?.itemNumber && state.currentItem?.name) {
    state.itemQueue.enqueue(state.currentItem as ParsedItem);
    if (debug) console.log("Enqueued final item:", state.currentItem);
  }

  // Combine items and prices
  const items: Item[] = [];
  while (!state.itemQueue.isEmpty() && !state.priceQueue.isEmpty()) {
    const item = state.itemQueue.dequeue();
    const price = state.priceQueue.dequeue();

    const result: Item = {
      itemNumber: item.itemNumber,
      name: item.name,
      price:
        item.unitQuantity && item.unitPrice
          ? item.unitQuantity * item.unitPrice
          : price,
      unitQuantity: item.unitQuantity || 1,
      unitPrice: item.unitPrice,
      type: item.type,
    };
    result.shouldDraftItem == (!!result.price && !isPrice(result.name));
    result.confidence = calculateConfidence(result);
    items.push(result);
    if (debug) console.log("Created result item:", result);
  }

  return items;
};

export function parseHEBReceipt(
  ocrLines: string[],
  blocks: any[]
): ReceiptData {
  // Normalize lines by removing empty lines and trimming whitespace
  const normalizedLines = ocrLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const receiptData: ReceiptData = {
    storeName: "H-E-B",
    storeAddress: "",
    storeNumber: "",
    datePurchased: new Date().toISOString(),
    taxAmount: 0,
    totalAmount: 0,
    items: [],
    totalItemsCount: getItemCount(normalizedLines),
    processingError: null,
  };

  receiptData.items = parseReceiptItems(normalizedLines);

  // Validate item count
  const totalQuantity = receiptData.items.reduce(
    (sum, item) => sum + item.unitQuantity,
    0
  );

  if (
    receiptData.totalItemsCount &&
    totalQuantity !== receiptData.totalItemsCount
  ) {
    const error = `Parsed item count (${totalQuantity}) does not match receipt total (${receiptData.totalItemsCount})`;
    receiptData.processingError = receiptData.processingError
      ? `${receiptData.processingError}; ${error}`
      : error;
  }

  return receiptData;
}

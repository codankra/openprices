import Queue from "../structs/queue";

interface ReceiptData {
  storeName: string;
  storeLocation: string;
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

const ITEM_TYPES = ["T", "TF", "TFW", "FW", "F", "W"];
const PRICE_TYPES = ["H", "Q", "HQ"];

const isPrice = (line: string): boolean => {
  const itemTypesPattern = ITEM_TYPES.map((type) => `${type}\\s+`).join("|");
  const priceTypesPattern = PRICE_TYPES.map((type) => `\\s+${type}`).join("|");
  const regex = new RegExp(
    `^(${itemTypesPattern})?-?\\d+\\.\\d{2}(${priceTypesPattern})?$`
  );
  return regex.test(line.trim());
};

const isItemDescriptionLine = (line: string): boolean => {
  const trimmed = line.trim();
  // If a line has capital alphabetic letters at any point, it may contain an item description
  return /[A-Z]/.test(trimmed);
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
  const price = match ? parseFloat(match[1]) : 0;
  const isNegative = line.trim().startsWith("-");

  match && console.log("detected price: ", isNegative ? -price : price);

  return isNegative ? -price : price;
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
  return trimmed.includes("****") || trimmed.includes("ITEMS PURCHASED");
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
    /orig/,
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
  const parts = cleanedName.trim().split(" ");
  const lastPart = parts[parts.length - 1];
  if (isPrice(lastPart)) {
    detectedPrice = parsePrice(lastPart);
    cleanedName = parts.slice(0, -1).join(" ");
  }
  // Extract type at (new) end if it exists
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
const getTotalAmount = (lines: string[]): number => {
  let foundTotalSale = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we found the "Total Sale" text
    if (trimmed.includes("Total Sale")) {
      foundTotalSale = true;

      // Check if the price is on the same line
      const priceMatch = trimmed.match(/-?(\d+\.\d{2})/);
      if (priceMatch) {
        return parseFloat(priceMatch[1]);
      }
      continue;
    }

    // If we previously found "Total Sale", look for the next price
    if (foundTotalSale && isPrice(trimmed)) {
      return parsePrice(trimmed);
    }
  }

  return 0;
};

export function findReceiptDate(lines: string[]): string {
  // Search from bottom up for date pattern
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(
      /(\d{2})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(P|A|PM|AM)?/
    );
    if (!match) continue;

    try {
      const [_, month, day, year, hours, minutes, period] = match;
      let hour = parseInt(hours);

      // Handle PM times
      if (period?.toUpperCase().includes("P") && hour !== 12) {
        hour += 12;
      } else if (period?.toUpperCase().includes("A") && hour === 12) {
        hour = 0;
      }

      return new Date(
        2000 + parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        hour,
        parseInt(minutes)
      ).toISOString();
    } catch (e) {
      console.error("Error parsing date:", e);
    }
  }
  // fallback: current date
  return new Date().toISOString();
}

export function findStoreLocation(lines: string[], brandName: string): string {
  const locatableStores = ["Central Market"];
  if (!locatableStores.includes(brandName)) {
    return brandName;
  }

  // First look for the store line with a number
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line.includes(brandName)) {
      const storeNumber = line.match(/\d{3,}/)?.[0];
      if (!storeNumber) continue; // Skip if no store number on this line

      let location = `${brandName} #${storeNumber}`;

      // Now check next line for address
      const nextLine = lines[i + 1].trim();
      if (/^\d+\s+[A-Za-z]/.test(nextLine)) {
        location += ` - ${nextLine}`;
      }

      return location;
    }
  }
  return brandName;
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

  // If not a price, then we act as if it describes an item
  else if (isItemDescriptionLine(line)) {
    const itemNumber = parseItemNumber(line);
    const startsWithNumber = /^\d+/.test(line);
    if (!startsWithNumber && state.currentItem?.itemNumber) {
      // This is a continuation of a standalone number
      const cleaned = cleanItemName(line);

      if (!state.currentItem.name) state.currentItem.name = cleaned.name;
      if (!state.currentItem.type) state.currentItem.type = cleaned.type;
      if (cleaned.price) state.priceQueue.enqueue(cleaned.price);
    } else if (itemNumber > 0) {
      // New item - Accept any valid item number
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
    result.shouldDraftItem =
      result.price >= 0.01 && !isPrice(result.name) && result.name.length > 4;
    result.confidence = calculateConfidence(result);
    items.push(result);
    if (debug) console.log("Created result item:", result);
  }

  return items;
};

export function parseHEBReceipt(
  ocrLines: string[],
  brandName: string,
  blocks: any[]
): ReceiptData {
  // Normalize lines by removing empty lines and trimming whitespace
  const normalizedLines = ocrLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const receiptData: ReceiptData = {
    storeName: brandName,
    storeLocation: findStoreLocation(ocrLines, brandName),
    datePurchased: findReceiptDate(ocrLines),
    taxAmount: 0,
    totalAmount: getTotalAmount(normalizedLines),
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

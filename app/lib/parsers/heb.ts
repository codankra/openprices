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
  type?: string; // F, FW, T, HQ, Q
  confidence: number;
}

interface PartialItem {
  itemNumber?: number;
  name?: string;
  price?: number;
  unitQuantity?: number;
  unitPrice?: number;
  type?: string;
}

export function parseHEBReceipt(
  ocrLines: string[],
  blocks: any[]
): ReceiptData {
  const receiptData: ReceiptData = {
    storeName: "H-E-B",
    storeAddress: "",
    storeNumber: extractStoreNumber(ocrLines[0]),
    datePurchased: "",
    taxAmount: 0,
    totalAmount: 0,
    items: [],
    totalItemsCount: 0,
    processingError: null,
  };

  // Normalize lines by removing empty lines and trimming whitespace
  const normalizedLines = ocrLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: Item[] = [];
  let currentItem: PartialItem = {};
  let i = 1; // Start after store number line

  while (i < normalizedLines.length) {
    const line = normalizedLines[i];

    // Skip lines that don't contain useful information
    if (shouldSkipLine(line, currentItem)) {
      i++;
      continue;
    }

    // Case 1: Line starts with a number that could be an item number
    const itemNumberMatch = line.match(/^(\d+)(?:\s|$)/);
    if (itemNumberMatch) {
      const possibleItemNumber = parseInt(itemNumberMatch[1]);

      // Check if this is actually a price or quantity line
      if (line.includes("Ea.") || line.match(/^\d+\.\d{2}$/)) {
        // This is a price or quantity line, not an item number
        if (currentItem.name) {
          // Process price or quantity for current item
          processQuantityOrPrice(line, currentItem);
        }
        i++;
        continue;
      }

      // If we have a complete item, add it before starting new one
      if (isCompleteItem(currentItem)) {
        items.push(finalizeItem(currentItem));
        currentItem = {};
      }

      // Start new item
      currentItem.itemNumber = possibleItemNumber;

      // Get rest of line after item number
      const remainingContent = line.slice(itemNumberMatch[0].length).trim();
      if (remainingContent) {
        // Check if remaining content has a price
        const priceMatch = remainingContent.match(
          /(.+?)\s+(?:(F|FW|T|HQ|Q)\s+)?(\d+\.\d{2})$/
        );
        if (priceMatch) {
          currentItem.name = priceMatch[1].trim();
          currentItem.price = parseFloat(priceMatch[3]);
          if (priceMatch[2]) {
            currentItem.type = priceMatch[2];
          }
        } else {
          currentItem.name = remainingContent;
        }
      }
    }
    // Case 2: Line is just a number (next item number)
    else if (line.match(/^\d+$/)) {
      const nextItemNumber = parseInt(line);

      // If we have a complete item, add it
      if (isCompleteItem(currentItem)) {
        items.push(finalizeItem(currentItem));
        currentItem = {};
      }

      // Start new item with just the number
      currentItem = { itemNumber: nextItemNumber };

      // Look ahead to next line for item content
      if (i + 1 < normalizedLines.length) {
        const nextLine = normalizedLines[i + 1];
        if (!shouldSkipLine(nextLine) && !nextLine.match(/^\d+(?:\s|$)/)) {
          // Next line contains item content
          const priceMatch = nextLine.match(
            /(.+?)\s+(?:(F|FW|T|HQ|Q)\s+)?(\d+\.\d{2})$/
          );
          if (priceMatch) {
            currentItem.name = priceMatch[1].trim();
            currentItem.price = parseFloat(priceMatch[3]);
            if (priceMatch[2]) {
              currentItem.type = priceMatch[2];
            }
          } else {
            currentItem.name = nextLine.trim();
          }
          i++; // Skip next line since we've processed it
        }
      }
    }
    // Case 3: Could be a price for current item
    else {
      const price = extractPriceFromLine(line);
      if (price !== null && currentItem.name && !currentItem.price) {
        currentItem.price = price;
      }
    }

    i++;
  }
  // Add final item if complete
  if (isCompleteItem(currentItem)) {
    items.push(finalizeItem(currentItem));
  }

  // Sort items by item number and validate no duplicates
  items.sort((a, b) => a.itemNumber - b.itemNumber);
  const itemNumbers = new Set<number>();
  const uniqueItems: Item[] = [];

  for (const item of items) {
    console.log(item);
    if (!itemNumbers.has(item.itemNumber)) {
      itemNumbers.add(item.itemNumber);
      uniqueItems.push(item);
    } else {
      receiptData.processingError = `Warning: Duplicate item number ${item.itemNumber} found`;
    }
  }

  receiptData.items = uniqueItems;

  // Validate item count
  const parsedItemCount = uniqueItems.length;
  if (parsedItemCount !== receiptData.totalItemsCount) {
    const error = `Parsed item count (${parsedItemCount}) does not match receipt total (${receiptData.totalItemsCount})`;
    receiptData.processingError = receiptData.processingError
      ? `${receiptData.processingError}; ${error}`
      : error;
  }

  return receiptData;
}

function extractPriceFromLine(line: string): number | null {
  // Generic price patterns we might find in any line
  const patterns = [
    // Original price in various formats
    /(\d+\.\d{2})\s*orig/,
    // Each price
    /(\d+\.\d{2})\s*Ea\./,
    // Standard price possibly followed by type indicator
    /(\d+\.\d{2})\s*(?:(?:EA|F|HQ|T|Q)\s*)?$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

function processQuantityOrPrice(line: string, item: PartialItem) {
  const quantityMatch = line.match(/(\d+)\s*Ea\.\s*@\s*([\d.]+)/i);
  if (quantityMatch) {
    item.unitQuantity = parseInt(quantityMatch[1]);
    item.unitPrice = parseFloat(quantityMatch[2]);
  } else {
    const price = extractPriceFromLine(line);
    if (price !== null && !item.price) {
      item.price = price;
      // Extract type if present
      const typeMatch = line.match(/\d+\.\d{2}\s*(F|FW|T|HQ|Q)/);
      if (typeMatch) {
        item.type = typeMatch[1];
      }
    }
  }
}

function isCompleteItem(item: PartialItem): boolean {
  return !!(item.itemNumber && item.name && item.price);
}

function finalizeItem(item: PartialItem): Item {
  // If no price found, set to 0
  const price = item.price || 0;

  return {
    itemNumber: item.itemNumber!,
    name: item.name!,
    price: price,
    unitQuantity: item.unitQuantity || 1,
    unitPrice: item.unitPrice || price,
    type: item.type,
    confidence: calculateConfidence(item as Item),
  };
}

function shouldSkipLine(
  line: string,
  currentItem: PartialItem | null = null
): boolean {
  // If we're looking for a price for current item, check if this line has one
  if (currentItem && currentItem.name && !currentItem.price) {
    const price = extractPriceFromLine(line);
    if (price !== null) {
      return false; // Don't skip lines that might contain our price
    }
  }

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

  return skipPatterns.some((pattern) => pattern.test(line));
}
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

function extractAmount(line: string): number {
  const match = line.match(/(\d+\.\d{2})/);
  return match ? parseFloat(match[1]) : 0;
}

function extractItemCount(line: string): number {
  const match = line.match(/ITEMS PURCHASED:\s*(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function extractStoreNumber(line: string): string {
  const match = line.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);
  return match ? match[1].replace(/\s/g, "") : "";
}

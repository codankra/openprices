import { findItemBounds } from "~/services/vision.server";

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
  name: string;
  price: number;
  unitQuantity: number;
  unitPrice?: number;
  confidence: number;
}

export function parseTraderJoesReceipt(
  ocrLines: string[],
  blocks: any[]
): ReceiptData {
  const receiptData: ReceiptData = {
    storeName: "",
    storeAddress: "",
    storeNumber: "",
    datePurchased: "",
    taxAmount: 0,
    totalAmount: 0,
    items: [],
    totalItemsCount: 0,
    processingError: null,
  };

  receiptData.storeName = ocrLines[0];
  receiptData.storeAddress = ocrLines.slice(1, 4).join(", ");
  receiptData.storeNumber = extractStoreNumber(ocrLines[4]);
  receiptData.datePurchased = extractDate(ocrLines);

  const items: Item[] = [];
  let i = 7; // Start parsing items from line 7
  while (i < ocrLines.length) {
    const item = parseItem(ocrLines, blocks, i);
    if (item) {
      items.push(item);
      i += item.unitPrice !== undefined ? 3 : 2;
    } else if (ocrLines[i].includes("Tax:")) {
      receiptData.taxAmount = extractTaxAmount(ocrLines[i]);
      break;
    } else {
      i++;
    }
  }
  receiptData.items = mergeDuplicateItems(items);
  receiptData.totalAmount = extractTotalAmount(ocrLines);
  receiptData.totalItemsCount = receiptData.items.reduce(
    (sum, item) => sum + item.unitQuantity,
    0
  );

  const statedItemCount = extractStatedItemCount(ocrLines);
  if (receiptData.totalItemsCount === statedItemCount) {
    console.log(
      "Success: Receipt Validation Marker 1: Parsed item count matches the stated item count on the receipt."
    );
  } else {
    let msg = `Error: Receipt Validation Marker 1: Parsed item count (${receiptData.totalItemsCount}) does not match the stated item count on the receipt (${statedItemCount}).`;

    console.error(msg);
    receiptData.processingError = msg;
  }

  return receiptData;
}

function extractStoreNumber(line: string): string {
  const match = line.match(/Store #(\d+)/);
  return match ? `#${match[1]}` : "";
}

function extractDate(ocrLines: string[]): string {
  for (const line of ocrLines) {
    const match = line.match(/(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (match) {
      const [, month, day, year, hours, minutes] = match;
      const date = new Date(`20${year}-${month}-${day} ${hours}:${minutes}`);
      return date.toISOString();
    }
  }
  return "";
}

function parseItem(
  ocrLines: string[],
  annotations: any[],
  index: number
): Item | null {
  if (index + 1 >= ocrLines.length) return null;

  const itemName = ocrLines[index];

  // Skip if item name is just a price
  if (itemName.match(/^\$\d+\.\d{2}$/)) return null;

  // Skip if item name is just a number
  if (itemName.match(/^\d+$/)) return null;

  // Skip if item name contains three asterisks
  if (itemName.includes("***")) return null;

  // Skip if item name contains "Gift Card" (case insensitive)
  if (itemName.toLowerCase().includes("gift card")) return null;

  const priceMatch = ocrLines[index + 1].match(/\$(\d+\.\d{2})/);

  if (!priceMatch) return null;
  // Collect all lines that belong to this item
  const itemText = [itemName, priceMatch[0]];
  let item: Item = {
    name: itemName,
    price: parseFloat(priceMatch[1]),
    unitQuantity: 1,
    confidence: 0.95,
  };

  if (index + 2 < ocrLines.length) {
    const quantityMatch = ocrLines[index + 2].match(/(\d+) @ \$(\d+\.?\d*)/);
    if (quantityMatch) {
      itemText.push(quantityMatch[0]);
      item.unitQuantity = parseInt(quantityMatch[1]);
      item.unitPrice = parseFloat(quantityMatch[2]);

      const calculatedPrice = Number(
        (item.unitQuantity * item.unitPrice).toFixed(2)
      );
      if (Math.abs(calculatedPrice - item.price) > 0.01) {
        item.confidence = 0.5;
      } else {
        item.confidence = Number(Math.sqrt(item.confidence).toFixed(2));
      }
    }
  }
  // Find the bounding box that encompasses all the item's text
  const bounds = findItemBounds(annotations, itemText);
  console.log("bounding receipt item ");
  console.log(bounds);
  item = { ...item, ...bounds };

  // Additional confidence adjustments
  if (
    item.name.includes("?") ||
    item.name.includes("...") ||
    item.name.includes("   ")
  ) {
    item.confidence *= 0.8;
  }
  if (item.price === 0 || item.unitQuantity === 0) {
    item.confidence *= 0.5;
  }

  return item;
}

function mergeDuplicateItems(items: Item[]): Item[] {
  const mergedItems: { [key: string]: Item } = {};
  for (const item of items) {
    const key = `${item.name}-${item.price}`;
    if (key in mergedItems) {
      mergedItems[key].unitQuantity += item.unitQuantity;
      mergedItems[key].confidence = Math.min(
        mergedItems[key].confidence,
        item.confidence
      );
    } else {
      mergedItems[key] = { ...item };
    }
  }
  return Object.values(mergedItems);
}

function extractTaxAmount(line: string): number {
  const match = line.match(/\$(\d+\.\d{2})/);
  return match ? parseFloat(match[1]) : 0;
}

function extractTotalAmount(ocrLines: string[]): number {
  for (let i = ocrLines.length - 1; i >= 0; i--) {
    const match = ocrLines[i].match(/\$(\d+\.\d{2})/);
    if (match) return parseFloat(match[1]);
  }
  return 0;
}

function extractStatedItemCount(ocrLines: string[]): number {
  for (const line of ocrLines) {
    const match = line.match(/Items in Transaction:\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return 0;
}

export type ReceiptItem = {
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  receiptText: string;
  price: number;
  unitQuantity: number;
  unitPrice?: number;
  confidence?: number;
  shouldDraftItem?: boolean;
};

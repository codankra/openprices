import { db } from "~/db/index";
import {
  products,
  priceEntries,
  productReceiptIdentifiers,
  draftItems,
  receipts,
} from "~/db/schema";
import { eq, and, inArray } from "drizzle-orm";

interface ReceiptContext {
  imageUrl: string;
  ocrResult: string;
  storeBrandName: string;
  storeLocation: string;
  purchaseDate: string;
  totalAmount?: number;
  taxAmount?: number;
}

interface ProcessedResults {
  receiptId: number;
  priceEntriesCreated: number;
  matchedUnitPriced: number;
  unmatched: number;
}

export async function processReceiptItems(
  items: (typeof draftItems.$inferInsert)[],
  receiptInfo: ReceiptContext,
  contributorId: string
): Promise<ProcessedResults> {
  return await db.transaction(async (tx) => {
    // 1. Create the receipt record
    const [receipt] = await tx
      .insert(receipts)
      .values({
        userId: contributorId,
        imageUrl: receiptInfo.imageUrl,
        rawOcrText: receiptInfo.ocrResult,
        storeBrandName: receiptInfo.storeBrandName,
        storeLocation: receiptInfo.storeLocation,
        purchaseDate: receiptInfo.purchaseDate,
        totalAmount: receiptInfo.totalAmount,
        status: "processed",
      })
      .returning({ id: receipts.id });

    // Get all unique identifiers from the receipt
    const identifiers = [...new Set(items.map((item) => item.receiptText))];

    // Batch query to get all matching product identifiers
    const matchedIdentifiers = await tx
      .select({
        receiptIdentifier: productReceiptIdentifiers.receiptIdentifier,
        productId: productReceiptIdentifiers.productId,
      })
      .from(productReceiptIdentifiers)
      .where(
        and(
          inArray(productReceiptIdentifiers.receiptIdentifier, identifiers),
          eq(
            productReceiptIdentifiers.storeBrandName,
            receiptInfo.storeBrandName
          )
        )
      );

    // Create lookup map for quick access
    const identifierToProductId = new Map(
      matchedIdentifiers.map((m) => [m.receiptIdentifier, m.productId])
    );

    // Get product details for all matched products in one query
    const matchedProducts = await tx
      .select()
      .from(products)
      .where(
        inArray(
          products.id,
          matchedIdentifiers
            .filter((m) => m.productId !== null)
            .map((m) => m.productId!)
        )
      );

    // Create lookup map for product details
    const productDetails = new Map(matchedProducts.map((p) => [p.id, p]));

    const results: ProcessedResults = {
      receiptId: receipt.id,
      priceEntriesCreated: 0,
      matchedUnitPriced: 0,
      unmatched: 0,
    };

    // Process items in batches
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const priceEntriesToInsert: (typeof priceEntries.$inferInsert)[] = [];
      const draftItemsToInsert: (typeof draftItems.$inferInsert)[] = [];

      for (const item of batch) {
        const productId = identifierToProductId.get(item.receiptText);

        if (!productId) {
          // No matching product found - add to draft items as pending
          draftItemsToInsert.push({
            receiptId: receipt.id,
            receiptText: item.receiptText,
            price: item.price,
            unitQuantity: item.unitQuantity,
            unitPrice: item.unitPrice,
            status: "pending",
            confidence: item.confidence,
          });
          results.unmatched++;
          continue;
        }

        const product = productDetails.get(productId);
        if (!product) continue;

        if (product.unitPricing) {
          // Product is unit priced - add to draft items as matched
          draftItemsToInsert.push({
            receiptId: receipt.id,
            receiptText: item.receiptText,
            price: item.price,
            unitQuantity: item.unitQuantity,
            unitPrice: item.unitPrice,
            status: "matched",
            confidence: item.confidence,
            notes: `Customer bought a specific amount of this item.`,
          });
          results.matchedUnitPriced++;
        } else {
          // Regular product - add price entry
          priceEntriesToInsert.push({
            productId: productId,
            price: item.price,
            date: receiptInfo.purchaseDate,
            storeLocation: receiptInfo.storeLocation,
            contributorId,
            entrySource: "receipt",
            receiptId: receipt.id,
            proof: receiptInfo.imageUrl,
          });
          // Also add completed draft item
          draftItemsToInsert.push({
            receiptId: receipt.id,
            receiptText: item.receiptText,
            price: item.price,
            unitQuantity: item.unitQuantity,
            unitPrice: item.unitPrice,
            status: "completed",
            confidence: item.confidence,
            notes: `Product and price Auto-Detected`,
          });

          results.priceEntriesCreated++;
        }
      }

      // Batch insert price entries
      if (priceEntriesToInsert.length > 0) {
        await tx.insert(priceEntries).values(priceEntriesToInsert);
      }

      // Batch insert draft items
      if (draftItemsToInsert.length > 0) {
        await tx.insert(draftItems).values(draftItemsToInsert);
      }
    }

    return results;
  });
}
// TODO: for all items, if their id is in the productReceiptIdentifiers table, then get the associated product. If product is not unitpriced, then we'll insert the priceEntry and mark the item complete. If unitpriced, we'll need to mark the item matched, but confirm quantity before inserting the priceEntry.
// all other items are drafts. what I want to do is get the couple closest productReceiptIdentifiers that exist and suggest them. if the product does not exist, the user will need to create the product, and we'll then do 4 things: add the product, add the price entry, add the productReceiptIdentifier, and mark the draftItem as complete.
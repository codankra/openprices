import { db } from "~/db/index";
import { 
  products, 
  priceEntries, 
  productReceiptIdentifiers,
  draftItems 
} from "~/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";

// Type for receipt items
interface ReceiptItem {
  identifier: string;
  price: number;
  date: string;
  storeLocation: string;
  storeBrandName: string;
}

interface ProcessedResults {
  processed: number;
  matchedUnitPriced: number;
  unmatched: number;
}

export async function processReceiptItems(
  items: ReceiptItem[],
  contributorId: string
): Promise<ProcessedResults> {
  return await db.transaction(async (tx) => {
    // Get all unique identifiers from the receipt
    const identifiers = [...new Set(items.map(item => item.identifier))];
    
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
          eq(productReceiptIdentifiers.storeBrandName, items[0].storeBrandName)
        )
      );

    // Create lookup map for quick access
    const identifierToProductId = new Map(
      matchedIdentifiers.map(m => [m.receiptIdentifier, m.productId])
    );

    // Get product details for all matched products in one query
    const matchedProducts = await tx
      .select()
      .from(products)
      .where(
        inArray(
          products.id,
          matchedIdentifiers.map(m => m.productId)
        )
      );

    // Create lookup map for product details
    const productDetails = new Map(
      matchedProducts.map(p => [p.id, p])
    );

    const results: ProcessedResults = {
      processed: 0,
      matchedUnitPriced: 0,
      unmatched: 0
    };

    // Process items in batches
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const priceEntriesToInsert = [];
      const draftItemsToInsert = [];

      for (const item of batch) {
        const productId = identifierToProductId.get(item.identifier);
        
        if (!productId) {
          // No matching product found - add to draft items as pending
          draftItemsToInsert.push({
            identifier: item.identifier,
            price: item.price,
            date: item.date,
            storeLocation: item.storeLocation,
            storeBrandName: item.storeBrandName,
            status: 'pending'
          });
          results.unmatched++;
          continue;
        }

        const product = productDetails.get(productId);
        if (!product) continue;

        if (product.unitPricing) {
          // Product is unit priced - add to draft items as matched
          draftItemsToInsert.push({
            identifier: item.identifier,
            price: item.price,
            date: item.date,
            storeLocation: item.storeLocation,
            storeBrandName: item.storeBrandName,
            status: 'matched',
            productId: productId
          });
          results.matchedUnitPriced++;
        } else {
          // Regular product - add price entry
          priceEntriesToInsert.push({
            productId: productId,
            price: item.price,
            date: item.date,
            storeLocation: item.storeLocation,
            contributorId: contributorId,
            entrySource: 'receipt'
          });
          results.processed++;
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

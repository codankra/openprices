import { draftItems, priceEntries, receipts, users } from "~/db/schema";
import { db } from "~/db/index";
import { eq, desc } from "drizzle-orm";
import { priceEntriesCache } from "~/db/cache";
import { withRetry } from "~/lib/utils";

export async function getSinglePriceEntryByID(id: string) {
  const cached: typeof priceEntries.$inferSelect | undefined =
    await priceEntriesCache.get(id);
  if (cached) return cached;
  else {
    const result = await db
      .select()
      .from(priceEntries)
      .where(eq(priceEntries.id, parseInt(id)))
      .limit(1);
    //I want to get userInfo probably too
    if (result.length > 0) {
      await priceEntriesCache.set(id, result[0]);
      return result[0];
    }
    return null;
  }
}

export async function getPriceEntriesByProductID(id: string) {
  return withRetry(async () => {
    try {
      const cached: (typeof priceEntries.$inferSelect)[] | undefined =
        await priceEntriesCache.get(`product-${id}`);
      if (cached) return cached;
      else {
        const result = await db
          .select({
            id: priceEntries.id,
            price: priceEntries.price,
            date: priceEntries.date,
            proof: priceEntries.proof,
            storeLocation: priceEntries.storeLocation,
            contributorName: users.name,
          })
          .from(priceEntries)
          .leftJoin(users, eq(priceEntries.contributorId, users.id))
          .where(eq(priceEntries.productId, parseInt(id)))
          .orderBy(desc(priceEntries.date))
          .limit(10);
        await priceEntriesCache.set(`product-${id}`, result);
        return result;
      }
    } catch (error) {
      console.error(`Error fetching price entries for product ${id}:`, error);
      // You might want to throw a custom error here or return a default value
      throw new Error(`Failed to fetch price entries for product ${id}`);
    }
  });
}
export async function addNewPriceEntry(
  priceEntryDetails: typeof priceEntries.$inferInsert
) {
  const newPriceEntry = await db
    .insert(priceEntries)
    .values({
      contributorId: priceEntryDetails.contributorId,
      productId: priceEntryDetails.productId,
      price: priceEntryDetails.price,
      date: priceEntryDetails.date,
      proof: priceEntryDetails.proof,
      storeLocation: priceEntryDetails.storeLocation,
      entrySource: priceEntryDetails.entrySource ?? "manual",
      receiptId: priceEntryDetails.receiptId ?? null,
    })
    .returning();

  if (newPriceEntry.length > 0) {
    const addedPriceEntry = newPriceEntry[0];
    const productId = addedPriceEntry.productId?.toString();
    if (!!productId) {
      const cached: (typeof priceEntries.$inferSelect)[] | undefined =
        await priceEntriesCache.get(`product-${productId}`);

      if (cached) {
        await priceEntriesCache.set(`product-${productId}`, [
          addedPriceEntry,
          ...cached,
        ]);
      } else {
        await priceEntriesCache.set(`product-${productId}`, [addedPriceEntry]);
      }
    }

    return addedPriceEntry.id.toString();
  }
  return 0;
}


// Helper function to save receipt details and create draft items
export async function saveReceiptDetails({
  userId,
  imageUrl,
  ocrResult,
  storeBrandName,
  storeLocation,
  purchaseDate,
  totalAmount,
  taxAmount,
  items,
}: {
  userId: string;
  imageUrl: string;
  ocrResult: string;
  storeBrandName: string;
  storeLocation: string;
  purchaseDate: string;
  totalAmount: number;
  taxAmount: number;
  items: Array<{
    text: string;
    price: number;
    quantity?: number;
    unitPrice?: number;
    confidence: number;
    suggestedProductId?: number;
  }>;
}) {
  // Start a transaction to ensure data consistency
  return await db.transaction(async (tx: any) => {
    // 1. Create the receipt record
    const [receipt] = await tx
      .insert(receipts)
      .values({
        userId,
        imageUrl,
        rawOcrText: ocrResult,
        storeBrandName,
        storeLocation,
        purchaseDate,
        totalAmount,
        taxAmount,
        status: "processed",
      })
      .returning({ id: receipts.id });

    // TODO: for all items, if their id is in the productReceiptIdentifiers table, then get the associated product. If product is not unitpriced, then we'll insert the priceEntry and mark the item complete. If unitpriced, we'll need to mark the item matched, but confirm quantity before inserting the priceEntry.
    // all other items are drafts. what I want to do is get the couple closest productReceiptIdentifiers that exist and suggest them. if the product does not exist, the user will need to create the product, and we'll then do 4 things: add the product, add the price entry, add the productReceiptIdentifier, and mark the draftItem as complete.
    const productSearchIDs = items.map((item) => )

    // 2. Create draft items for each item detected in the receipt
    const draftItemsToInsert = items.map((item) => ({
      receiptId: receipt.id,
      receiptText: item.text,
      price: item.price,
      unitQuantity: item.quantity,
      unitPrice: item.unitPrice,
           confidence: item.confidence,
      suggestedProductId: item.suggestedProductId,
      status: item.suggestedProductId ? "matched" : "pending",
    }));

    await tx.insert(draftItems).values(draftItemsToInsert);

    // 3. For high-confidence matches, create price entries automatically
    const highConfidenceItems = items.filter(
      (item) => item.suggestedProductId && item.confidence > 0.9
    );

    if (highConfidenceItems.length > 0) {
      const priceEntriesToInsert = highConfidenceItems.map((item) => ({
        contributorId: userId,
        productId: item.suggestedProductId!,
        price: item.price,
        date: purchaseDate,
        proof: imageUrl,
        storeLocation,
        entrySource: "receipt" as const,
        receiptId: receipt.id,
      }));

      await tx.insert(priceEntries).values(priceEntriesToInsert);
    }

    return receipt;
  });
}

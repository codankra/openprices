import {
  priceEntries,
  users,
  receipts,
  productReceiptIdentifiers,
  draftItems,
  products,
} from "~/db/schema";
import { db } from "~/db/index";
import { eq, desc, gte, and } from "drizzle-orm";
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

export async function getPriceEntriesByContributorID(
  id: string,
  days: number = 30
) {
  return withRetry(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const cached: (typeof priceEntries.$inferSelect)[] | undefined =
        await priceEntriesCache.get(`contributor-${id}-days-${days}`);
      if (cached) return cached;
      else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);

        const result = await db
          .select({
            id: priceEntries.id,
            productId: priceEntries.productId,
            entrySource: priceEntries.entrySource,
            verified: priceEntries.verified,
            price: priceEntries.price,
            date: priceEntries.date,
            proof: priceEntries.proof,
            storeLocation: priceEntries.storeLocation,
            createdAt: priceEntries.createdAt,
          })
          .from(priceEntries)
          .where(
            and(
              eq(priceEntries.contributorId, id),
              gte(priceEntries.createdAt, cutoffDate.toISOString())
            )
          )
          .orderBy(desc(priceEntries.createdAt));
        await priceEntriesCache.set(`contributor-${id}-days-${days}`, result);
        return result;
      }
    } catch (error) {
      console.error(
        `Error fetching price entries for contributor ${id}:`,
        error
      );
      throw new Error(`Failed to fetch price entries for contributor ${id}`);
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

// If unitpriced, we'll need to mark the item matched, but confirm quantity before inserting the priceEntry.
// insertMatchedUnitpricedEntry()

// all other items are drafts. what I want to do is get the couple closest productReceiptIdentifiers that exist and suggest them. if the product does not exist, the user will need to create the product, and we'll then do 4 things: add the product, add the price entry, add the productReceiptIdentifier, and mark the draftItem as complete.
export async function createNewReceiptItemPriceEntry(
  receiptInfo: typeof receipts.$inferSelect,
  createItemData: {
    receiptText: string;
    name: string;
    upc: string;
    category: string;
    unitQty: number;
    unitType: string;
    pricePerUnit: number;
    unitPricing: boolean;
  },
  userId: string,
  productImageUrl: string | null,
  draftItemId: number
) {
  return await db.transaction(async (tx) => {
    const productBrandsMap: Record<string, string> = {
      "Trader Joe's": "Trader Joe's",
      "Costco Wholesale": "Kirkland Signature",
      "H-E-B": "",
    };
    const productBrand =
      productBrandsMap[receiptInfo.storeBrandName ?? ""] || null;
    const [newProduct] = await tx
      .insert(products)
      .values({
        contributedBy: userId,
        name: createItemData.name,
        upc: createItemData.upc,
        category: createItemData.category,
        latestPrice: createItemData.pricePerUnit,
        unitPricing: createItemData.unitPricing,
        unitQty: createItemData.unitQty,
        unitType: createItemData.unitType,
        productBrandName: productBrand,
        image: productImageUrl,
        active: true,
      })
      .returning({ id: products.id });

    if (!newProduct) throw new Error("PRODUCT_CREATION_FAILED");

    // Create receipt identifier
    await tx.insert(productReceiptIdentifiers).values({
      productId: newProduct.id,
      storeBrandName: receiptInfo.storeBrandName!,
      receiptIdentifier: createItemData.receiptText,
    });

    // Create price entry
    const [newPriceEntry] = await tx
      .insert(priceEntries)
      .values({
        contributorId: userId,
        productId: newProduct.id,
        price: createItemData.pricePerUnit,
        date: receiptInfo.purchaseDate,
        storeLocation: receiptInfo.storeLocation,
        entrySource: "receipt",
        receiptId: receiptInfo.id,
        proof: receiptInfo.imageUrl,
      })
      .returning();

    if (!newPriceEntry) throw new Error("PRICE_ENTRY_CREATION_FAILED");

    // Update draft item status
    await tx
      .update(draftItems)
      .set({
        status: "completed",
        productId: newProduct.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(draftItems.id, draftItemId));

    // Initialize cache for this product's price entries
    await priceEntriesCache.set(`product-${newProduct.id}`, [newPriceEntry]);

    return {
      productId: newProduct.id,
      priceEntryId: newPriceEntry.id.toString(),
    };
  });
}

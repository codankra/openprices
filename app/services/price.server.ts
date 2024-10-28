import { priceEntries, users } from "~/db/schema";
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
              gte(priceEntries.createdAt, cutoffDate)
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

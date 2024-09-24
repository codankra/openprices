import { priceEntries, users } from "~/db/schema";
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

import { priceEntries, users } from "~/db/schema";
import { db } from "~/db/index";
import { eq, desc } from "drizzle-orm";
import { priceEntriesCache } from "~/db/cache";

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
  const cached: typeof priceEntries.$inferSelect | undefined =
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
}

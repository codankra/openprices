import { caching, MemoryCache } from "cache-manager";

let productSearchCache: MemoryCache;
let productInfoCache: MemoryCache;
let productBrandsCache: MemoryCache;
let priceEntriesCache: MemoryCache;

async function initializeCaches() {
  productSearchCache = await caching("memory", {
    max: 100,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  productInfoCache = await caching("memory", {
    max: 100,
    ttl: 60 * 60 * 1000, // 1 hour
  });

  productBrandsCache = await caching("memory", {
    max: 5,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  });
  priceEntriesCache = await caching("memory", {
    max: 100,
    ttl: 10 * 60 * 1000, // 10 minutes
  });
}

export async function ensureCachesInitialized() {
  if (!productSearchCache) {
    await initializeCaches();
  }
}
export {
  priceEntriesCache,
  productSearchCache,
  productInfoCache,
  productBrandsCache,
};

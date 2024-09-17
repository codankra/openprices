import { caching, MemoryCache } from "cache-manager";

export const productSearchCache = await caching("memory", {
  max: 100,
  ttl: 10 * 60 * 1000 /*milliseconds*/,
});

export const productInfoCache = await caching("memory", {
  max: 100,
  ttl: 60 * 60 * 1000 /*milliseconds*/,
});

export const productBrandsCache = await caching("memory", {
  max: 5,
  ttl: 24 * 60 * 60 * 1000 /*milliseconds*/,
});

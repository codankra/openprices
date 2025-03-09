import {
  products,
  productBrands,
  draftItems,
  productReceiptIdentifiers,
  requestedEdits,
} from "~/db/schema";
import { db } from "~/db/index";
import { and, eq, like, desc, inArray, isNull, gte, lte } from "drizzle-orm";
import {
  productInfoCache,
  productSearchCache,
  productBrandsCache,
} from "~/db/cache";

const ALL_BRANDS_CACHE_KEY = "_system_search_all_brands";
const SEARCH_CACHE_ENCODING_VERSION = "v1";

export async function getProductById(id: string) {
  const cached: typeof products.$inferSelect | undefined =
    await productInfoCache.get(id);

  if (cached) return cached;
  else {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        latestPrice: products.latestPrice,
        unitPricing: products.unitPricing,
        unitQty: products.unitQty,
        unitType: products.unitType,
        productBrandName: products.productBrandName,
        upc: products.upc,
        image: products.image,
      })
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (result.length > 0) {
      await productInfoCache.set(id, result[0]);
      return result[0];
    }
    return null;
  }
}

export async function getAllReceiptProducts(
  receiptNumber: number,
  productIds: number[]
) {
  const cacheKey = `receipt-${receiptNumber}`;
  const cached: (typeof products.$inferSelect)[] | undefined =
    await productInfoCache.get(cacheKey);

  if (cached) return cached;

  const result = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      latestPrice: products.latestPrice,
      unitPricing: products.unitPricing,
      unitQty: products.unitQty,
      unitType: products.unitType,
      productBrandName: products.productBrandName,
      upc: products.upc,
      image: products.image,
    })
    .from(products)
    .where(inArray(products.id, productIds))
    .limit(100);

  if (result.length > 0) {
    await productInfoCache.set(cacheKey, result, 1000 * 60 * 60 * 24);
    return result;
  }
  return [];
}

export async function getProductsByUpc(upc: string) {
  const cacheKey = `upc-${upc}`;
  const cached: (typeof products.$inferSelect)[] | undefined =
    await productInfoCache.get(cacheKey);

  if (cached) return cached;

  const result = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      latestPrice: products.latestPrice,
      unitPricing: products.unitPricing,
      unitQty: products.unitQty,
      unitType: products.unitType,
      productBrandName: products.productBrandName,
      upc: products.upc,
      image: products.image,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.upc, upc))
    .orderBy(desc(products.createdAt)) // Most recently created first
    .limit(10); // Reasonable limit for UI display

  if (result.length > 0) {
    await productInfoCache.set(cacheKey, result);
    return result;
  }

  return null;
}

export async function getProductIDByReceiptText(
  text: string,
  storeBrand: string
) {
  const result = await db
    .select({ pid: productReceiptIdentifiers.productId })
    .from(productReceiptIdentifiers)
    .where(
      and(
        eq(productReceiptIdentifiers.receiptIdentifier, text),
        eq(productReceiptIdentifiers.storeBrandName, storeBrand)
      )
    )
    .limit(1);
  if (result.length > 0) {
    return result[0].pid;
  }
  return null;
}

export async function getProductsBySearch(
  searchTerm: string,
  maxResults: number = 12,
  options: {
    brandFilters?: string[];
    priceFilterType?: "unknown" | "range" | null;
    minPrice?: number;
    maxPrice?: number;
  } = {}
) {
  // Build cache key components
  const keyParts = [SEARCH_CACHE_ENCODING_VERSION];
  keyParts.push(`term:${searchTerm}`);
  keyParts.push(`max:${maxResults}`);

  if (options.brandFilters && options.brandFilters.length > 0) {
    const sortedBrands = [...options.brandFilters].sort();
    keyParts.push(`brands:${sortedBrands.join(",")}`);
  }

  if (options.priceFilterType) {
    keyParts.push(`ptype:${options.priceFilterType}`);

    if (options.priceFilterType === "range") {
      if (options.minPrice !== undefined) {
        keyParts.push(`pmin:${options.minPrice}`);
      }
      if (options.maxPrice !== undefined) {
        keyParts.push(`pmax:${options.maxPrice}`);
      }
    }
  }

  const cacheKey = keyParts.join("|");

  const cached: (typeof products.$inferSelect)[] | undefined =
    await productSearchCache.get(cacheKey);
  if (cached) return cached;
  // Initialize an array to hold all conditions
  const conditions = [];

  // Add search term filter if provided
  if (searchTerm.length > 0) {
    conditions.push(like(products.name, `%${searchTerm}%`));
  }

  // Add brand filters if provided
  if (options.brandFilters && options.brandFilters.length > 0) {
    conditions.push(inArray(products.productBrandName, options.brandFilters));
  }

  // Add price filters based on type
  if (options.priceFilterType === "unknown") {
    conditions.push(isNull(products.latestPrice));
  } else if (options.priceFilterType === "range") {
    if (options.minPrice !== undefined && options.maxPrice !== undefined) {
      conditions.push(
        and(
          gte(products.latestPrice, options.minPrice),
          lte(products.latestPrice, options.maxPrice)
        )
      );
    } else if (options.minPrice !== undefined) {
      conditions.push(gte(products.latestPrice, options.minPrice));
    } else if (options.maxPrice !== undefined) {
      conditions.push(lte(products.latestPrice, options.maxPrice));
    }
  }

  // Build the query with a single where clause
  const query = db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(maxResults);

  const searchResults = await query;

  await productSearchCache.set(cacheKey, searchResults);
  return searchResults;
}
export async function getProductBrandInfo(brandName: string) {
  const cached: typeof productBrands.$inferSelect | undefined =
    await productBrandsCache.get(brandName);
  if (cached) return cached;
  else {
    const result = await db
      .select({
        name: productBrands.name,
        website: productBrands.website,
        image: productBrands.image,
        description: productBrands.description,
        headquarters: productBrands.headquarters,
        isStoreOwner: productBrands.isStoreOwner,
      })
      .from(productBrands)
      .where(eq(productBrands.name, brandName))
      .limit(1);
    if (result.length > 0) {
      await productBrandsCache.set(brandName, result[0]);
      return result[0];
    }
    return null;
  }
}

export async function getAllProductBrands() {
  const cached: (typeof productBrands.$inferSelect)[] | undefined =
    await productBrandsCache.get(ALL_BRANDS_CACHE_KEY);
  if (cached) return cached;
  else {
    const allBrands = await db.select().from(productBrands);
    await productBrandsCache.set(ALL_BRANDS_CACHE_KEY, allBrands);
    return allBrands;
  }
}
export async function getProductAndBrandByID(id: string) {
  const productInfo = await getProductById(id);
  if (!productInfo) return null;
  else {
    const brandInfo = productInfo.productBrandName
      ? await getProductBrandInfo(productInfo.productBrandName)
      : null;
    return { productInfo, brandInfo };
  }
}

export async function addNewProduct(productDetails: {
  name: string;
  category: string;
  latestPrice: number;
  unitPricing: boolean;
  unitQty: number;
  unitType: string;
  productBrandName: string;
  upc: string;
  image?: string;
}) {
  const newProduct = await db
    .insert(products)
    .values(productDetails)
    .returning();

  if (newProduct.length > 0) {
    const addedProduct = newProduct[0];
    await productInfoCache.set(addedProduct.id.toString(), addedProduct);
    return addedProduct.id;
  }
  return 0;
}

export async function updateProductLatestPrice(id: number, newPrice: number) {
  const updatedProduct = await db
    .update(products)
    .set({ latestPrice: newPrice })
    .where(eq(products.id, id))
    .returning();

  if (updatedProduct.length > 0) {
    const product = updatedProduct[0];
    await productInfoCache.set(id.toString(), product);
    return product;
  }
  return null;
}

export async function requestProductEdit(
  upc: string,
  editNotes: string,
  editType: string = "generic"
) {
  const editRequest = await db
    .insert(requestedEdits)
    .values({
      productUpc: upc,
      editNotes: editNotes,
      editType: editType,
      status: "pending",
    })
    .returning();

  if (editRequest.length > 0) {
    return editRequest[0];
  }
  return null;
}

export async function ignoreProductDraftItem(id: number) {
  return db
    .update(draftItems)
    .set({ status: "ignored", updatedAt: new Date().toISOString() })
    .where(and(eq(draftItems.id, id), eq(draftItems.status, "pending")))
    .catch((error) => {
      console.error(`Failed to ignore draft item ${id}:`, error);
    });
}

export async function completeProductDraftItem(
  id: number,
  productId: number | null
) {
  return db
    .update(draftItems)
    .set({
      status: "completed",
      updatedAt: new Date().toISOString(),
      productId: productId,
    })
    .where(eq(draftItems.id, id))
    .catch((error) => {
      console.error(`Failed to ignore draft item ${id}:`, error);
    });
}

export async function verifyDraftItemStatus(
  id: number,
  expectedStatus: typeof draftItems.$inferSelect.status
) {
  try {
    const result = await db
      .select()
      .from(draftItems)
      .where(and(eq(draftItems.id, id), eq(draftItems.status, expectedStatus)))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error(`Failed to verify draft item ${id} status:`, error);
    return false;
  }
}

export async function addProductReceiptTextIdentifier(
  pri: typeof productReceiptIdentifiers.$inferInsert
) {
  const result = await db
    .insert(productReceiptIdentifiers)
    .values({
      receiptIdentifier: pri.receiptIdentifier,
      storeBrandName: pri.storeBrandName,
      productId: pri.productId,
    })
    .onConflictDoNothing({
      target: [
        productReceiptIdentifiers.receiptIdentifier,
        productReceiptIdentifiers.storeBrandName,
      ],
    })
    .returning();

  if (result.length > 0) {
    return result[0];
  }
  return null;
}

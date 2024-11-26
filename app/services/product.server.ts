import {
  products,
  productBrands,
  draftItems,
  productReceiptIdentifiers,
  requestedEdits,
} from "~/db/schema";
import { db } from "~/db/index";
import { and, eq, like } from "drizzle-orm";
import {
  productInfoCache,
  productSearchCache,
  productBrandsCache,
} from "~/db/cache";

const ALL_BRANDS_CACHE_KEY = "_system_search_all_brands";

export async function getProductById(id: string) {
  const cached: typeof products.$inferSelect | undefined =
    await productInfoCache.get(id);

  if (cached) return cached;
  else {
    const result = await db
      .select()
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

export async function getProductByUpc(upc: string) {
  const cached: typeof products.$inferSelect | undefined =
    await productInfoCache.get(`upc-${upc}`);

  if (cached) return cached;
  else {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.upc, upc))
      .limit(1);

    if (result.length > 0) {
      await productInfoCache.set(`upc-${upc}`, result[0]);
      return result[0];
    }
    return null;
  }
}

export async function getProductByReceiptText(
  text: string,
  storeBrand: string
) {
  const cached: typeof products.$inferSelect | undefined =
    await productInfoCache.get(`pri_${text}_${storeBrand}`);

  if (cached) return cached;
  else {
    const result = await db
      .select()
      .from(productReceiptIdentifiers)
      .where(
        and(
          eq(productReceiptIdentifiers.receiptIdentifier, text),
          eq(productReceiptIdentifiers.storeBrandName, storeBrand)
        )
      )
      .limit(1);

    if (result.length > 0) {
      await productInfoCache.set(`pri_${text}_${storeBrand}`, result[0]);
      return result[0];
    }
    return null;
  }
}

export async function getProductsBySearch(searchTerm: string) {
  const cached: (typeof products.$inferSelect)[] | undefined =
    await productSearchCache.get(searchTerm);
  if (cached) return cached;
  else {
    const searchResults = await db
      .select()
      .from(products)
      .where(like(products.name, `%${searchTerm}%`))
      .limit(10);
    await productSearchCache.set(searchTerm, searchResults);
    return searchResults;
  }
}

export async function getProductBrandInfo(brandName: string) {
  const cached: typeof productBrands.$inferSelect | undefined =
    await productBrandsCache.get(brandName);
  if (cached) return cached;
  else {
    const result = await db
      .select()
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

export async function requestProductEdit(upc: string, editNotes: string) {
  const editRequest = await db
    .insert(requestedEdits)
    .values({
      productUpc: upc,
      editNotes: editNotes,
      editType: "receipt-mismatch",
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
    .set({ status: "ignored", updatedAt: new Date() })
    .where(and(eq(draftItems.id, id), eq(draftItems.status, "pending")))
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

import { db } from "~/db/index";
import {
  products,
  priceEntries,
  productReceiptIdentifiers,
  draftItems,
  receipts,
} from "~/db/schema";
import { eq, and, inArray, gte } from "drizzle-orm";
import { damerauLevenshtein } from "~/lib/utils";
import type { ReceiptItem } from "~/lib/types";
import { createR2URL, deleteFromR2, uploadToR2 } from "./r2.server";
import { detectReceiptText } from "./vision.server";
import { createJob, removeJob, emitJobUpdate } from "~/services/job.server";

const supportedBrands = [
  { label: "TRADER JOE'S", brandName: "Trader Joe's" },
  { label: "H-E-B", brandName: "H-E-B" },
  // { label: "Costco", brandName: "Costco Wholesale" },
];

export function determineReceiptBrand(header: string) {
  let bestBrand = null;
  let bestScore = 0.75; // 75% similarity threshold
  for (let brand of supportedBrands) {
    if (brand.label === header) {
      bestBrand = brand.brandName;
      break;
    }
    const score =
      1 -
      damerauLevenshtein(header.toLowerCase(), brand.label.toLowerCase()) /
        Math.max(header.length, brand.label.length);
    if (score > bestScore) {
      bestBrand = brand.brandName;
      bestScore = score;
    }
  }
  return bestBrand;
}

export function determineReceiptLocation(
  storeBrandName: string,
  storeNumber: string,
  storeAddress: string
) {
  // At the moment of writing, all the app expects is a descriptive string.
  return `${storeBrandName} ${storeNumber} - ${storeAddress}`;
}

export async function getReceiptByID(
  receiptId: number,
  contributorId: string
): Promise<typeof receipts.$inferSelect | null> {
  try {
    // Get receipt details and verify ownership
    const receipt = await db
      .select()
      .from(receipts)
      .where(
        and(eq(receipts.id, receiptId), eq(receipts.userId, contributorId))
      )
      .limit(1);

    if (receipt.length === 0) {
      return null;
    }

    return receipt[0];
  } catch (error) {
    console.error("Error fetching receipt details:", error);
    throw error;
  }
}

export async function getReceiptsByContributorID(
  contributorId: string,
  days: number = 30
) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const receipts_list = await db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.userId, contributorId),
          gte(receipts.createdAt, cutoffDate.toISOString())
        )
      );

    return receipts_list;
  } catch (error) {
    console.error("Error fetching receipts:", error);
    throw error;
  }
}

export async function getReceiptItemsByReceiptID(receiptId: number) {
  try {
    const draftItemsList = await db
      .select()
      .from(draftItems)
      .where(eq(draftItems.receiptId, receiptId));

    return draftItemsList;
  } catch (error) {
    console.error("Error fetching receipt items:", error);
    throw error;
  }
}

export async function getReceiptDetails(
  receiptId: number,
  contributorId: string
) {
  try {
    // Get receipt details and verify ownership
    const receiptItemsPromise = getReceiptItemsByReceiptID(receiptId);
    const receipt = await getReceiptByID(receiptId, contributorId);
    if (!receipt) {
      console.error("Receipt not found or unauthorized");
      return null;
    }
    const receiptItems = await receiptItemsPromise;
    return {
      receipt,
      receiptItems,
    };
  } catch (error) {
    console.error("Error fetching receipt details:", error);
    throw error;
  }
}

interface ProcessedResults {
  receiptId: number;
  priceEntriesCreated: number;
  matchedUnitPriced: number;
  unmatched: number;
}

export async function processReceiptItems(
  items: ReceiptItem[],
  receiptInfo: typeof receipts.$inferInsert
): Promise<ProcessedResults> {
  console.log("Starting processReceiptItems");
  return await db.transaction(async (tx) => {
    try {
      console.log("Beginning database transaction");

      // 1. Create the receipt record
      console.log("Creating receipt record");
      const [receipt] = await tx
        .insert(receipts)
        .values({
          userId: receiptInfo.userId,
          imageUrl: receiptInfo.imageUrl,
          rawOcrText: receiptInfo.rawOcrText,
          storeBrandName: receiptInfo.storeBrandName,
          storeLocation: receiptInfo.storeLocation,
          purchaseDate: receiptInfo.purchaseDate,
          totalAmount: receiptInfo.totalAmount,
          status: "processed",
        })
        .returning({ id: receipts.id });

      // Get all unique identifiers from the receipt
      const identifiers = [...new Set(items.map((item) => item.receiptText))];
      console.log(`Extracted ${identifiers.length} unique identifiers`);

      // Batch query to get all matching product identifiers
      console.log("Querying for matching product identifiers");
      const matchedIdentifiers = await tx
        .select({
          receiptIdentifier: productReceiptIdentifiers.receiptIdentifier,
          productId: productReceiptIdentifiers.productId,
        })
        .from(productReceiptIdentifiers)
        .where(
          and(
            inArray(productReceiptIdentifiers.receiptIdentifier, identifiers),
            eq(
              productReceiptIdentifiers.storeBrandName,
              receiptInfo.storeBrandName!
            )
          )
        );

      // Create lookup map for quick access
      const identifierToProductId = new Map(
        matchedIdentifiers.map((m) => [m.receiptIdentifier, m.productId])
      );
      console.log(
        `Created lookup map with ${identifierToProductId.size} entries`
      );

      // Get product details for all matched products in one query
      console.log("Querying for matched product details");
      const matchedProducts = await tx
        .select()
        .from(products)
        .where(
          inArray(
            products.id,
            matchedIdentifiers
              .filter((m) => m.productId !== null)
              .map((m) => m.productId!)
          )
        );

      // Create lookup map for product details
      const productDetails = new Map(matchedProducts.map((p) => [p.id, p]));

      const results: ProcessedResults = {
        receiptId: receipt.id,
        priceEntriesCreated: 0,
        matchedUnitPriced: 0,
        unmatched: 0,
      };

      // Process items in batches
      const batchSize = 100;
      console.log(
        `Processing ${items.length} items in batches of ${batchSize}`
      );
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}`);

        const priceEntriesToInsert: (typeof priceEntries.$inferInsert)[] = [];
        const draftItemsToInsert: (typeof draftItems.$inferInsert)[] = [];

        for (const item of batch) {
          try {
            console.log(`Processing item: ${item.receiptText}`);
            const productId = identifierToProductId.get(item.receiptText);

            if (!productId) {
              // No matching product found - add to draft items as pending
              draftItemsToInsert.push({
                receiptId: receipt.id,
                receiptText: item.receiptText,
                price: item.price,
                unitQuantity: item.unitQuantity,
                unitPrice: item.unitPrice,
                status: "pending",
                confidence: item.confidence,
                maxX: item.maxX,
                maxY: item.maxY,
                minX: item.minX,
                minY: item.minY,
                isVisible: item.shouldDraftItem,
              });
              results.unmatched++;
              continue;
            }

            const product = productDetails.get(productId);
            if (!product) {
              console.log(
                `Product details not found for productId: ${productId}`
              );
              continue;
            }

            if (product.unitPricing) {
              // Product is unit priced - add to draft items as matched
              draftItemsToInsert.push({
                receiptId: receipt.id,
                productId: productId,
                receiptText: item.receiptText,
                price: item.price,
                unitQuantity: item.unitQuantity,
                unitPrice: item.unitPrice,
                status: "matched",
                confidence: item.confidence,
                notes: `Customer bought a specific amount of this item.`,
                maxX: item.maxX,
                maxY: item.maxY,
                minX: item.minX,
                minY: item.minY,
                isVisible: true,
              });
              results.matchedUnitPriced++;
            } else {
              if (!item.unitPrice) item.unitPrice = item.price;
              // Regular product - add price entry
              priceEntriesToInsert.push({
                productId: productId,
                price: item.unitPrice ?? item.price,
                date: receiptInfo.purchaseDate,
                storeLocation: receiptInfo.storeLocation,
                contributorId: receiptInfo.userId,
                entrySource: "receipt",
                receiptId: receipt.id,
                proof: receiptInfo.imageUrl,
              });
              // Also add completed draft item
              draftItemsToInsert.push({
                receiptId: receipt.id,
                productId: productId,
                receiptText: item.receiptText,
                price: item.price,
                unitQuantity: item.unitQuantity,
                unitPrice: item.unitPrice,
                status: "completed",
                confidence: item.confidence,
                notes: `Product and price Auto-Detected`,
                maxX: item.maxX,
                maxY: item.maxY,
                minX: item.minX,
                minY: item.minY,
              });

              results.priceEntriesCreated++;
            }
          } catch (error) {
            console.error(`Error processing item: ${item.receiptText}`, error);
          }
        }

        // Batch insert price entries
        if (priceEntriesToInsert.length > 0) {
          try {
            console.log(
              `Inserting ${priceEntriesToInsert.length} price entries`
            );
            await tx.insert(priceEntries).values(priceEntriesToInsert);
          } catch (error) {
            console.error("Error inserting price entries:", error);
            throw error;
          }
        }

        // Batch insert draft items
        if (draftItemsToInsert.length > 0) {
          try {
            console.log(`Inserting ${draftItemsToInsert.length} draft items`);
            await tx.insert(draftItems).values(draftItemsToInsert);
          } catch (error) {
            console.error("Error inserting draft items:", error);
            throw error;
          }
        }
      }
      // Update the receipt record with finalized processing results
      await tx
        .update(receipts)
        .set({
          processedPriceEntries: results.priceEntriesCreated,
          processedMatchedItems: results.matchedUnitPriced,
          processedUnmatchedTxt: results.unmatched,
        })
        .where(eq(receipts.id, receipt.id));

      console.log("Processing complete. Returning results:", results);
      return results;
    } catch (error) {
      console.error("Error in processReceiptItems:", error);
      throw error;
    }
  });
}
// TODO: for all items, if their id is in the productReceiptIdentifiers table, then get the associated product. If product is not unitpriced, then we'll insert the priceEntry and mark the item complete. If unitpriced, we'll need to mark the item matched, but confirm quantity before inserting the priceEntry.
// all other items are drafts. what I want to do is get the couple closest productReceiptIdentifiers that exist and suggest them. if the product does not exist, the user will need to create the product, and we'll then do 4 things: add the product, add the price entry, add the productReceiptIdentifier, and mark the draftItem as complete.

interface StatusItem {
  message: string;
  status: "completed" | "in-progress" | "not-started" | "error";
}

export type ReceiptProcessResultsData = ProcessedResults & {
  summary: string;
  url: string;
};

type ReceiptProcessResults = {
  completed: true;
  error?: string;
  statusList: StatusItem[];
  results?: ReceiptProcessResultsData;
};

export async function processReceiptInBackground(
  jobId: string,
  receipt: File,
  userId: string
) {
  let statusList: StatusItem[] = [
    { message: "🌐 Uploading Receipt", status: "completed" },
    { message: "📷 Saving Receipt Image...", status: "not-started" },
  ];

  const updateStatus = (
    index: number,
    newStatus: StatusItem["status"],
    message?: string
  ) => {
    statusList[index].status = newStatus;
    if (message) statusList[index].message = message;
    emitJobUpdate(jobId, JSON.stringify({ statusList }));
  };

  const receiptFilename = `receipts/${Date.now()}-${receipt.name}`;
  const receiptURL = createR2URL(receiptFilename);
  let uploadHasStarted = false;
  try {
    createJob(jobId, userId);
    updateStatus(0, "completed", "🌐 Receipt Uploaded");
    updateStatus(1, "in-progress");

    const imageBuffer = Buffer.from(await receipt.arrayBuffer());
    await uploadToR2(receiptFilename, imageBuffer);
    updateStatus(1, "completed", "📷 Image Created for the Receipt");
    uploadHasStarted = true;

    statusList.push({
      message: "🔍 Scanning Receipt Details...",
      status: "not-started",
    });
    updateStatus(2, "in-progress");
    const parsedReceipt = await detectReceiptText(imageBuffer);
    updateStatus(
      2,
      "completed",
      `🛒 Receipt Items and Store Info Detected: <strong>${parsedReceipt.storeBrandName}</strong>`
    );

    statusList.push({
      message: "🏷️ Saving Prices for Items...",
      status: "not-started",
    });
    statusList.push({ message: "Finalizing Results", status: "not-started" });
    updateStatus(3, "in-progress");

    const receiptItems = parsedReceipt.items;
    const receiptInfo: typeof receipts.$inferInsert = {
      imageUrl: receiptURL,
      userId,
      ...parsedReceipt,
    };
    const receiptProcessingResponse = await processReceiptItems(
      receiptItems,
      receiptInfo
    );
    updateStatus(
      3,
      "completed",
      `🏷️ Saved Prices for ${receiptItems.length} Items`
    );

    updateStatus(4, "in-progress");

    const summary =
      `Created ${receiptProcessingResponse.priceEntriesCreated} price entries, ` +
      `matched ${receiptProcessingResponse.matchedUnitPriced} unit-priced items, ` +
      `and found ${receiptProcessingResponse.unmatched} unmatched items.`;
    updateStatus(4, "completed", "🏁 Results Ready");

    const receiptProcessResults: ReceiptProcessResults = {
      statusList,
      completed: true,
      results: { ...receiptProcessingResponse, url: receiptURL, summary },
    };
    emitJobUpdate(jobId, JSON.stringify(receiptProcessResults));
  } catch (error) {
    console.error(error);
    statusList.forEach((item, index) => {
      if (item.status === "in-progress") {
        updateStatus(index, "error");
      }
    });
    if (uploadHasStarted) {
      console.log("Attempting to free R2 resource at: ", receiptURL);
      await deleteFromR2(receiptFilename);
    }
    const receiptErrorResults: ReceiptProcessResults = {
      statusList,
      error:
        "Failed to Process Receipt. Please make sure the photo is clear and follows the instructions.\n\nRefresh this page or try again later.",
      completed: true,
    };
    emitJobUpdate(jobId, JSON.stringify(receiptErrorResults));
  } finally {
    removeJob(jobId);
  }
}

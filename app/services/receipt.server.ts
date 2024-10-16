import { db } from "~/db/index";
import {
  products,
  priceEntries,
  productReceiptIdentifiers,
  draftItems,
  receipts,
} from "~/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { damerauLevenshtein } from "~/lib/utils";
import { createR2URL, uploadToR2 } from "./r2.server";
import { detectReceiptText } from "./vision.server";
import {
  createJob,
  removeJob,
  jobEventEmitter,
  emitJobUpdate,
} from "~/services/job.server";

const supportedBrands = [
  { label: "TRADER JOE'S", brandName: "Trader Joe's" },
  { label: "Costco", brandName: "Costco Wholesale" },
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

interface ProcessedResults {
  receiptId: number;
  priceEntriesCreated: number;
  matchedUnitPriced: number;
  unmatched: number;
}

export async function processReceiptItems(
  items: (typeof draftItems.$inferInsert)[],
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
                receiptText: item.receiptText,
                price: item.price,
                unitQuantity: item.unitQuantity,
                unitPrice: item.unitPrice,
                status: "matched",
                confidence: item.confidence,
                notes: `Customer bought a specific amount of this item.`,
              });
              results.matchedUnitPriced++;
            } else {
              // Regular product - add price entry
              priceEntriesToInsert.push({
                productId: productId,
                price: item.price,
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
                receiptText: item.receiptText,
                price: item.price,
                unitQuantity: item.unitQuantity,
                unitPrice: item.unitPrice,
                status: "completed",
                confidence: item.confidence,
                notes: `Product and price Auto-Detected`,
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
          }
        }

        // Batch insert draft items
        if (draftItemsToInsert.length > 0) {
          try {
            console.log(`Inserting ${draftItemsToInsert.length} draft items`);
            await tx.insert(draftItems).values(draftItemsToInsert);
          } catch (error) {
            console.error("Error inserting draft items:", error);
          }
        }
      }

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

export async function processReceiptInBackground(
  jobId: string,
  receipt: File,
  userId: string
) {
  let statusList: StatusItem[] = [
    { message: "Initializing receipt processing", status: "completed" },
    { message: "Creating receipt URL", status: "in-progress" },
    { message: "Uploading to R2 storage", status: "not-started" },
    { message: "Parsing receipt text", status: "not-started" },
    { message: "Processing receipt items", status: "not-started" },
    { message: "Finalizing results", status: "not-started" },
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

  try {
    createJob(jobId, userId);

    updateStatus(1, "completed");
    const receiptFilename = `receipts/${Date.now()}-${receipt.name}`;
    const receiptURL = createR2URL(receiptFilename);

    updateStatus(2, "in-progress");
    const imageBuffer = Buffer.from(await receipt.arrayBuffer());
    const cloudflareResponse = await uploadToR2(receiptFilename, imageBuffer);
    updateStatus(2, "completed");

    updateStatus(3, "in-progress");
    const parsedReceipt = await detectReceiptText(imageBuffer);
    updateStatus(
      3,
      "completed",
      `Receipt Items and Store Info Parsed: ${parsedReceipt.storeBrandName}`
    );

    updateStatus(4, "in-progress");
    const receiptItems = parsedReceipt.items.map((item) => ({
      receiptId: 0,
      ...item,
      receiptText: item.name,
    }));
    const receiptInfo: typeof receipts.$inferInsert = {
      imageUrl: receiptURL,
      userId,
      ...parsedReceipt,
    };

    const receiptProcessingResponse = await processReceiptItems(
      receiptItems,
      receiptInfo
    );
    updateStatus(4, "completed");

    updateStatus(5, "in-progress");
    const summary =
      `Created ${receiptProcessingResponse.priceEntriesCreated} price entries, ` +
      `matched ${receiptProcessingResponse.matchedUnitPriced} unit-priced items, ` +
      `and found ${receiptProcessingResponse.unmatched} unmatched items.`;
    updateStatus(5, "completed");

    emitJobUpdate(
      jobId,
      JSON.stringify({
        statusList,
        summary,
        completed: true,
        url: receiptURL,
        process: receiptProcessingResponse,
        cloudflareResponse,
      })
    );
  } catch (error) {
    console.error(error);
    statusList.forEach((item, index) => {
      if (item.status === "in-progress" || item.status === "not-started") {
        updateStatus(index, "error");
      }
    });
    emitJobUpdate(
      jobId,
      JSON.stringify({
        statusList,
        error: "Failed to process receipt",
        completed: true,
      })
    );
  } finally {
    removeJob(jobId);
  }
}

import { ImageAnnotatorClient } from "@google-cloud/vision";
import {
  determineReceiptBrand,
  determineReceiptLocation,
} from "./receipt.server";
import { receipts } from "~/db/schema";
import { parseTraderJoesReceipt } from "~/lib/parsers/tj";

type ReceiptItem = {
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  name: string;
  price: number;
  unitQuantity: number;
  unitPrice?: number;
  confidence: number;
};

type ParsedReceipt = Omit<
  typeof receipts.$inferInsert,
  "userId" | "imageUrl"
> & {
  items: ReceiptItem[];
};

type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

// Note: textAnnotations[0] contains the full text, individual words start at index 1
export const findItemBounds = (
  annotations: any[],
  itemText: string[]
): BoundingBox => {
  let bounds: BoundingBox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  // Skip the first annotation which contains all text
  const wordAnnotations = annotations.slice(1);

  // For each line of text we're looking for (item name, price, quantity)
  for (const searchText of itemText) {
    // Find all annotations that are part of this line
    const matchingAnnotations = wordAnnotations.filter((annotation) => {
      const desc = annotation.description.trim();
      return searchText.includes(desc) || desc.includes(searchText);
    });

    // Update bounds to include all matching annotations
    for (const annotation of matchingAnnotations) {
      const vertices = annotation.boundingPoly.vertices;
      for (const vertex of vertices) {
        bounds.minX = Math.min(bounds.minX, vertex.x);
        bounds.minY = Math.min(bounds.minY, vertex.y);
        bounds.maxX = Math.max(bounds.maxX, vertex.x);
        bounds.maxY = Math.max(bounds.maxY, vertex.y);
      }
    }
  }

  // If no bounds were found, return default
  if (bounds.minX === Infinity) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  // Add some padding around the bounds
  const padding = 5;
  bounds.minX = Math.max(0, bounds.minX - padding);
  bounds.minY = Math.max(0, bounds.minY - padding);
  bounds.maxX = bounds.maxX + padding;
  bounds.maxY = bounds.maxY + padding;

  return bounds;
};

const createVisionClient = () => {
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CLOUD_CREDENTIALS, "base64").toString()
    );
    return new ImageAnnotatorClient({
      credentials,
    });
  }
  // When running on Google Cloud Platform, this will use ADC automatically
  return new ImageAnnotatorClient();
};

const parseReceiptText = (text: string, blocks: any[]): ParsedReceipt => {
  const lines = text.split("\n").map((line) => line.trim());
  const storeName = determineReceiptBrand(lines[0].trim());
  if (storeName) {
    console.log("Detected Receipt from supported store ", storeName);
    if (storeName === "Trader Joe's") {
      const tj = parseTraderJoesReceipt(lines, blocks);
      let receipt: ParsedReceipt = {
        storeBrandName: "Trader Joe's",
        storeLocation: determineReceiptLocation(
          "Trader Joe's",
          tj.storeNumber,
          tj.storeAddress
        ),
        rawOcrText: text,
        purchaseDate: tj.datePurchased,
        totalAmount: tj.totalAmount,
        taxAmount: tj.taxAmount,
        status: "pending",
        items: tj.items,
        processingErrors: tj.processingError,
      };
      return receipt;
    } else {
      let msg =
        "Error Determining Store: Could not determine store, or processing receipts from this store is not yet supported.";
      console.error(msg);
      throw new Error(msg);
    }
  } else {
    let msg =
      "Error Determining Store: Could not determine store, or processing receipts from this store is not yet supported.";
    console.error(msg);
    throw new Error(msg);
  }
};

const detectReceiptText = async (
  imageBuffer: Buffer
): Promise<ParsedReceipt> => {
  const client = createVisionClient();

  try {
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    if (!detections?.length) {
      throw new Error("No text detected in receipt");
    }

    return parseReceiptText(detections[0].description!, detections);
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
};
export { detectReceiptText };

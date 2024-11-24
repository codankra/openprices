import { ImageAnnotatorClient, protos } from "@google-cloud/vision";
import type { google } from "@google-cloud/vision/build/protos/protos";

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

type BarcodeInfo = {
  value: string;
  format: string;
  confidence: number;
};

type DetectedBarcode = {
  barcode: BarcodeInfo;
  textValue?: string; // Optional OCR'd text value below barcode
  confidence: number;
};
// Define the correct interface for barcode annotations
interface IBarcodeAnnotation {
  boundingBox?: google.cloud.vision.v1.IBoundingPoly;
  rawValue?: string;
  format?: string;
  displayValue?: string;
  confidence?: number;
}

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

const detectBarcodes = async (
  imageBuffer: Buffer
): Promise<DetectedBarcode[]> => {
  const client = createVisionClient();

  try {
    console.log("Receiving Image to detect");
    const [result] = await client.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: protos.google.cloud.vision.v1.Feature.Type.TEXT_DETECTION },
        {
          type: protos.google.cloud.vision.v1.Feature.Type.OBJECT_LOCALIZATION,
        },
      ],
    });

    // Cast the result to include barcode annotations
    const barcodeResults = (result as any).localizedObjectAnnotations?.filter(
      (obj: any) => obj.name === "Barcode"
    );
    console.log("Detected possible barcodes");
    console.log(barcodeResults);

    if (!result.fullTextAnnotation && !barcodeResults?.length) {
      return [];
    }

    // Extract barcode information
    const barcodes: DetectedBarcode[] =
      barcodeResults?.map((barcode: IBarcodeAnnotation) => {
        const boundingBox = barcode.boundingBox;

        // Extract nearby text that might be the barcode number
        const nearbyText = boundingBox
          ? findNearbyText(
              boundingBox,
              result.fullTextAnnotation?.pages?.[0].blocks ?? undefined
            )
          : undefined;

        return {
          barcode: {
            value: barcode.displayValue || barcode.rawValue || "",
            format: barcode.format || "UNKNOWN",
            confidence: barcode.confidence || 0,
          },
          textValue: nearbyText,
          confidence: barcode.confidence || 0,
        };
      }) || [];

    console.log(barcodes);

    // Validate and clean up results
    return barcodes
      .filter((b) => b.barcode.value || b.textValue)
      .map((b) => ({
        ...b,
        barcode: {
          ...b.barcode,
          value: selectBestBarcodeValue(b.barcode.value, b.textValue),
        },
      }));
  } catch (error) {
    console.error("Error detecting barcodes:", error);
    throw error;
  }
};

// Updated helper function to work with text blocks
const findNearbyText = (
  barcodeBounds: google.cloud.vision.v1.IBoundingPoly,
  textBlocks?: google.cloud.vision.v1.IBlock[]
): string | undefined => {
  if (!barcodeBounds?.vertices || !textBlocks) return undefined;

  // Calculate the area below the barcode
  const vertices = barcodeBounds.vertices;
  const barcodeBottom = Math.max(...vertices.map((v) => v.y || 0));
  const barcodeLeft = Math.min(...vertices.map((v) => v.x || 0));
  const barcodeRight = Math.max(...vertices.map((v) => v.x || 0));

  // Look for text blocks below the barcode
  const nearbyText = textBlocks
    .filter((block) => {
      const blockBounds = block.boundingBox?.vertices;
      if (!blockBounds) return false;

      const blockTop = Math.min(...blockBounds.map((v) => v.y || 0));
      const blockLeft = Math.min(...blockBounds.map((v) => v.x || 0));
      const blockRight = Math.max(...blockBounds.map((v) => v.x || 0));

      // Check if the text is below and roughly aligned with the barcode
      return (
        blockTop > barcodeBottom &&
        blockTop < barcodeBottom + 50 && // Within 50 pixels
        blockLeft >= barcodeLeft - 20 && // Allow 20 pixels misalignment
        blockRight <= barcodeRight + 20
      );
    })
    .map((block) => {
      // Access the text content through paragraphs and words
      return (
        block.paragraphs
          ?.map((paragraph) =>
            paragraph.words
              ?.map((word) =>
                word.symbols?.map((symbol) => symbol.text).join("")
              )
              .join(" ")
          )
          .join(" ") || ""
      );
    })
    .join(" ")
    .replace(/[^\d]/g, ""); // Keep only digits

  console.log("Found nearbyText?? ", nearbyText);

  return nearbyText || undefined;
};

const selectBestBarcodeValue = (
  barcodeValue: string,
  textValue: string | undefined
): string => {
  const validLengths = [8, 12, 13, 14];

  const cleaned = {
    barcode: barcodeValue.replace(/[^\d]/g, ""),
    text: (textValue || "").replace(/[^\d]/g, ""),
  };

  if (!cleaned.barcode) return cleaned.text;
  if (!cleaned.text) return cleaned.barcode;

  const barcodeValid = validLengths.includes(cleaned.barcode.length);
  const textValid = validLengths.includes(cleaned.text.length);

  if (barcodeValid && !textValid) return cleaned.barcode;
  if (!textValid && textValid) return cleaned.text;

  return cleaned.barcode;
};

const testBarcodeDetection = async (imageBuffer: Buffer) => {
  const client = createVisionClient();
  const [result] = await client.annotateImage({
    image: { content: imageBuffer },
    features: [{ type: "BARCODE_DETECTION" }],
  });
  console.log("Raw result:", JSON.stringify(result, null, 2));
};

export { detectReceiptText, detectBarcodes, testBarcodeDetection };

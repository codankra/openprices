import { ImageAnnotatorClient } from "@google-cloud/vision";
import { VertexAI } from "@google-cloud/vertexai";
import {
  determineReceiptBrand,
  determineReceiptLocation,
} from "./receipt.server";
import { receipts, UnitType } from "~/db/schema";
import type { ReceiptItem } from "~/lib/types";
import { parseTraderJoesReceipt } from "~/lib/parsers/tj";
import { parseHEBReceipt } from "~/lib/parsers/heb";
import { rateLimiter } from "./rateLimiter.service";

interface ProductInfo {
  productName: string;
  productBrandName: string;
  category: string;
  unitType: string;
  unitQuantity: number;
}
// Supported MIME types for Gemini Vision
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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
const findItemBounds = (
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
const rateLimitedExtractProductInfo = rateLimiter.wrapWithRateLimit(
  "vertex-ai",
  async (imageData: string, mimeType: string): Promise<ProductInfo> => {
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        `Unsupported image format: ${mimeType}. Supported formats are: ${Array.from(
          SUPPORTED_MIME_TYPES
        ).join(", ")}`
      );
    }

    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const LOCATION = "us-central1";
    let credentials;
    try {
      credentials = JSON.parse(
        Buffer.from(
          process.env.GOOGLE_CLOUD_CREDENTIALS || "",
          "base64"
        ).toString()
      );
    } catch (error) {
      console.error("Failed to parse credentials:", error);
      throw new Error("Invalid credentials format");
    }

    const vertex = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
      googleAuthOptions: {
        credentials,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      },
    });

    const model = vertex.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const availableUnitTypeValues = Object.values(UnitType)
      .map((v) => `"${v}"`)
      .join(", ");

    const prompt = `Analyze this product image and return ONLY a JSON object with no additional text or explanation. Format:

{
  "productName": string, // Full product name excluding brand (e.g., "Organic Half & Half" not "Trader Joe's Organic Half & Half")
  "productBrandName": string, // Brand name only (e.g., "Trader Joe's", "Boar's Head", "Kraft")
  "category": string, // Specific product described in 1-3 words (e.g., "Black Beans", "Mango", "Half & Half")
  "unitType": string, // Must be one of: [${availableUnitTypeValues}].
  "unitQuantity": number, // One numerical quantity only, no units (e.g., 11.5 for 11.5oz)
  "isUnitPriced": boolean // true for some fresh deli meats/cheeses, bulk items, produce sold by weight, meat/seafood counter items, or any items typically price labeled by weight/volume at checkout, false for almost all other standard packaged grocery items.
}
`;

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageData, // Remove data:image/jpeg;base64, prefix if present
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.15, // Lower temperature for more consistent formatting
        },
      });

      const response = result.response;
      const textResponse = response.candidates?.[0].content.parts[0].text;

      // Validate that response is pure JSON
      if (
        !textResponse ||
        !textResponse.trim().startsWith("{") ||
        !textResponse.trim().endsWith("}")
      ) {
        throw new Error("Invalid response format");
      }

      return JSON.parse(textResponse) as ProductInfo;
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error("Failed to process product image");
    }
  }
);

const parseReceiptText = (text: string, blocks: any[]): ParsedReceipt => {
  const lines = text.split("\n").map((line) => line.trim());
  const receiptBrand =
    determineReceiptBrand(lines[0].trim()) ||
    determineReceiptBrand(`${lines[0].trim()} ${lines[1]?.trim() || ""}`);
  console.log(lines);
  if (!!receiptBrand) {
    console.log(
      "Detected Receipt from supported store ",
      receiptBrand.brandName
    );
    if (receiptBrand.parser === "Trader Joe's") {
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
        items: tj.items.map((item) => ({ ...item, receiptText: item.name })),
        processingErrors: tj.processingError,
      };
      return receipt;
    } else if (receiptBrand.parser === "heb") {
      const heb = parseHEBReceipt(lines, receiptBrand.brandName, blocks);
      let receipt: ParsedReceipt = {
        storeBrandName: receiptBrand.brandName,
        storeLocation: heb.storeLocation,
        rawOcrText: text,
        purchaseDate: heb.datePurchased,
        totalAmount: heb.totalAmount,
        taxAmount: heb.taxAmount,
        status: "pending",
        items: heb.items.map((item) => ({ ...item, receiptText: item.name })),
        processingErrors: heb.processingError,
      };
      return receipt;
    } else {
      let msg =
        "Error Determining Store: Could not determine store, or processing receipts from this store is not yet supported.";
      console.error(msg);
      console.error("Detected Brand: ");
      console.error(receiptBrand);
      throw new Error(msg);
    }
  } else {
    let msg =
      "Error Determining Store: Could not determine store, or processing receipts from this store is not yet supported.";
    console.error(msg);
    console.error("First line of receipt OCR: ", lines[0], "\n");
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
export {
  detectReceiptText,
  rateLimitedExtractProductInfo as extractProductInfo,
  findItemBounds,
};

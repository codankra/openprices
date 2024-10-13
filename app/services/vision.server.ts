import { ImageAnnotatorClient } from "@google-cloud/vision";
import {
  determineReceiptBrand,
  determineReceiptLocation,
} from "./receipt.server";
import { receipts } from "~/db/schema";
import { parseTraderJoesReceipt } from "~/lib/parsers/tj";
type ReceiptItem = {
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

const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text.split("\n").map((line) => line.trim());
  const storeName = determineReceiptBrand(lines[0].trim());
  if (storeName) {
    console.log("Detected Receipt from supported store ", storeName);
    if (storeName === "Trader Joe's") {
      const tj = parseTraderJoesReceipt(lines);
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

    return parseReceiptText(detections[0].description!);
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
};

export { detectReceiptText };

import { ImageAnnotatorClient } from "@google-cloud/vision";

interface StoreInfo {
  name: string;
  location: string;
  date: string;
}

interface ReceiptItem {
  name: string;
  price: number;
}

interface ParsedReceipt {
  storeInfo: StoreInfo;
  items: ReceiptItem[];
  total: number | null;
  rawText: string;
}

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

// Common patterns for finding store information
const STORE_PATTERNS: {
  storeName: RegExp[];
  address: RegExp[];
  total: RegExp[];
  date: RegExp[];
} = {
  storeName: [
    /TRADER\s*JOE'?S/i,
    /WHOLE\s*FOODS/i,
    /H-E-B/i,
    /WALMART/i,
    /TARGET/i,
    // Add more store patterns as needed
  ],
  address: [
    /(\d+)\s+([^,]+),?\s*([A-Za-z]+)\s*,\s*([A-Z]{2})\s*(\d{5})/i, // Standard US address
    /(\d+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln))/i, // Street address
  ],
  total: [
    /total\s*\$?\s*(\d+\.\d{2})/i,
    /amount\s*\$?\s*(\d+\.\d{2})/i,
    /balance\s*\$?\s*(\d+\.\d{2})/i,
  ],
  date: [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
  ],
};

const extractPrice = (text: string): number | null => {
  const priceMatch = text.match(/\$?\s*(\d+\.\d{2})/);
  return priceMatch ? parseFloat(priceMatch[1]) : null;
};

const findPattern = (text: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
};

const cleanItemName = (name: string): string => {
  return name
    .replace(/\$\s*\d+\.\d{2}/, "") // Remove price
    .replace(/^\d+\s*@\s*\d+\.\d{2}/, "") // Remove quantity pricing
    .replace(/\s{2,}/g, " ") // Remove extra spaces
    .trim();
};

const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text.split("\n").map((line) => line.trim());

  // Find store information
  const storeName =
    lines
      .find((line) =>
        STORE_PATTERNS.storeName.some((pattern) => pattern.test(line))
      )
      ?.trim() || "Unknown Store";

  // Find address
  const address =
    lines
      .find((line) =>
        STORE_PATTERNS.address.some((pattern) => pattern.test(line))
      )
      ?.trim() || "";

  // Find date
  let date = lines
    .find((line) => STORE_PATTERNS.date.some((pattern) => pattern.test(line)))
    ?.trim();
  if (!date) date = new Date().toISOString();

  // Extract items and prices
  const items: ReceiptItem[] = [];
  let total: any = null;

  lines.forEach((line, index) => {
    // Skip header/footer lines
    if (line.includes("SALE") || line.includes("-----") || !line.trim()) return;

    // Check for total
    if (!total) {
      for (const pattern of STORE_PATTERNS.total) {
        const match = line.match(pattern);
        if (match) {
          total = parseFloat(match[1]);
          return;
        }
      }
    }

    // Look for price patterns
    const price = extractPrice(line);
    if (price !== null) {
      const name = cleanItemName(line);
      if (name && !STORE_PATTERNS.total.some((pattern) => pattern.test(line))) {
        items.push({ name, price });
      }
    }
  });

  // If we didn't find a total, use the last price that appears to be a total
  if (!total) {
    const totalItem = items.find(
      (item: any) =>
        item.name.toLowerCase().includes("total") ||
        item.name.toLowerCase().includes("amount due")
    );
    if (totalItem) {
      total = totalItem.price;
      items.splice(items.indexOf(totalItem), 1);
    }
  }

  return {
    storeInfo: {
      name: storeName,
      location: address,
      date,
    },
    items,
    total,
    rawText: text,
  };
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

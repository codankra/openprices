import AWS from "aws-sdk";
import crypto from "crypto";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// Configure the S3 client for Cloudflare R2
const s3Client = new AWS.S3({
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY, // Use the raw SECRET_ACCESS_KEY
  signatureVersion: "v4",
  region: "auto", // Cloudflare R2 doesn't use regions, but this is required by the SDK
});

// Function to fetch the object
async function fetchObject() {
  // Specify the object key
  const objectKey = "zenzense.png";
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: objectKey,
    };

    const data = await s3Client.getObject(params).promise();
    console.log("Successfully fetched the object");

    // Process the data as needed
    // For example, to get the content as a Buffer:
    // const content = data.Body;

    // Or to save the file (requires 'fs' module):
    // const fs = require('fs').promises;
    // await fs.writeFile('ingested_0001.parquet', data.Body);
  } catch (error) {
    console.error("Failed to fetch the object:", error);
  }
}
fetchObject();

export async function uploadToR2(
  filename: string,
  fileData: Buffer
): Promise<string> {
  const key = `${filename}`;

  try {
    await s3Client
      .putObject({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileData,
        ContentType: getContentType(filename),
      })
      .promise();

    return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${key}`;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload to R2: ${error}`);
  }
}
function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

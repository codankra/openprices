import { S3 } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const CDN_HOST = process.env.CDN_HOST!;

const s3Client = new S3({
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  // Cloudflare R2 doesn't use regions, but this is required by the SDK
  region: "auto",
});
export function createR2URL(key: string): string {
  return `${CDN_HOST}/${key}`;
}
export async function uploadToR2(
  filename: string,
  fileData: Buffer
): Promise<string> {
  const key = filename;

  try {
    await s3Client.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileData,
      ContentType: getContentType(filename),
    });
    // Supply the function caller with the new resource URL
    return createR2URL(key);
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload to R2: ${error}`);
  }
}

export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    await s3Client.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    console.log(`Successfully deleted object with key: ${key}`);
    return true;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    return false;
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

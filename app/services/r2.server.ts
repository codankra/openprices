import { createHash, createHmac } from "crypto";

const CLOUDFLARE_R2S3_URI = process.env.CLOUDFLARE_R2S3_URI;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2S3_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2S3_SECRET;
const R2_BUCKET_NAME = CLOUDFLARE_R2S3_URI?.split("/").pop();

export async function uploadToR2(
  filename: string,
  fileData: Buffer,
  filepath: string
) {
  const key = `${filepath}/${Date.now()}-${filename}`;
  const url = `${CLOUDFLARE_R2S3_URI}/${key}`;

  const date = new Date().toUTCString();
  const contentType = getContentType(filename);
  const contentMd5 = createHash("md5").update(fileData).digest("base64");

  const stringToSign = [
    "PUT",
    contentMd5,
    contentType,
    date,
    `/${R2_BUCKET_NAME}/${key}`,
  ].join("\n");

  const signature = createHmac("sha1", R2_SECRET_ACCESS_KEY!)
    .update(stringToSign)
    .digest("base64");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-MD5": contentMd5,
      Date: date,
      Authorization: `AWS ${R2_ACCESS_KEY_ID}:${signature}`,
    },
    body: fileData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload to R2: ${response.statusText}`);
  }

  return url;
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
    default:
      return "application/octet-stream";
  }
}

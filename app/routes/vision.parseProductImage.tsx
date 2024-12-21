import type { ActionFunctionArgs } from "react-router";
import { extractProductInfo } from "~/services/vision.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const image = formData.get("image") as File;

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64Image = buffer.toString("base64");

  try {
    const productInfo = await extractProductInfo(base64Image, image.type);
    return Response.json({ success: true, productInfo });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unsupported image format")
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Error processing image:", error);
    return Response.json({ error: "Failed to process image" }, { status: 500 });
  }
}

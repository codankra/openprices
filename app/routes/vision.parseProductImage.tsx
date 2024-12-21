import type { ActionFunctionArgs } from "react-router";
import { checkAuth } from "~/services/auth.server";
import { extractProductInfo } from "~/services/vision.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await checkAuth(request);
  if (!user)
    return Response.json(
      { success: false, message: "Authentication Failure" },
      { status: 401 }
    );

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
    if (error instanceof Error) {
      if (error.message.includes("Unsupported image format")) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Rate limit exceeded")) {
        console.error(
          "[Error][Image Parsing]: Request Rate Limit Exceeded. Please try again later."
        );
        return Response.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter: 60, // Seconds until the next window
          },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
            },
          }
        );
      }
    }
    console.error("Error processing image:", error);
    return Response.json({ error: "Failed to process image" }, { status: 500 });
  }
}

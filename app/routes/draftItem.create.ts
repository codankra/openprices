import { json, type ActionFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import { createNewReceiptItemPriceEntry } from "~/services/price.server";
import { uploadToR2 } from "~/services/r2.server";
import { getReceiptByID } from "~/services/receipt.server";

const uploadFiles = async (files: File[], path: string) => {
  const urls = [];
  for (const file of files) {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error(`File ${file.name} is too large (max 3MB)`);
    }
    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type
      )
    ) {
      throw new Error(`Invalid file type for ${file.name}`);
    }
    const buffer = await file.arrayBuffer();
    const url = await uploadToR2(
      `${path}/${Date.now()}-${file.name}`,
      Buffer.from(buffer)
    );
    urls.push(url);
  }
  return urls;
};

export async function action({ request }: ActionFunctionArgs) {
  const user = await auth.isAuthenticated(request);
  if (!user)
    return json(
      { success: false, message: "Please retry after authenticating." },
      { status: 401 }
    );

  const formData = await request.formData();
  const receiptId = Number(formData.get("receiptId"));
  // get receipt by draftItemId and userId
  // if null, error out 400
  if (isNaN(receiptId)) {
    return json(
      { success: false, message: "Critical item details are missing." },
      { status: 400 }
    );
  }
  const receiptInfo = await getReceiptByID(receiptId, user.id);
  if (receiptInfo === null) {
    return json(
      {
        success: false,
        message: "Unable to find receipt details for your item.",
      },
      { status: 400 }
    );
  }

  //otherwise get product image if exists and upload it, returning url
  const productImageFile: File | null = formData.get("productImage") as File;
  const productImageUrl = productImageFile
    ? (await uploadFiles([productImageFile], "plu"))[0]
    : undefined;

  //finally pass draftItemInfo, receiptInfo, and productInfo to:
  createNewReceiptItemPriceEntry(
    receiptInfo,
    formData,
    user.id,
    productImageUrl
  );

  return json(
    {
      success: true,
      message: "A new item was created, thank you for contributing!",
    },
    { status: 200 }
  );
}

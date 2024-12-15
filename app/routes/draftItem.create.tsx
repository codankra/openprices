import { data, type ActionFunctionArgs } from "react-router";
import { checkAuth } from "~/services/auth.server";
import { createNewReceiptItemPriceEntry } from "~/services/price.server";
import { verifyDraftItemStatus } from "~/services/product.server";
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
  const user = await checkAuth(request);
  if (!user)
    return Response.json(
      data(
        { success: false, message: "Authentication Failure" },
        { status: 401 }
      )
    );

  const formData = await request.formData();
  const receiptId = Number(formData.get("receiptId"));
  const draftItemId = Number(formData.get("draftItemId"));
  // get receipt by draftItemId and userId
  // if null, error out 400
  if (isNaN(receiptId) || isNaN(draftItemId)) {
    return Response.json(
      data(
        { success: false, message: "Critical item details are missing." },
        { status: 400 }
      )
    );
  }
  const receiptInfo = await getReceiptByID(receiptId, user.id);
  if (receiptInfo === null) {
    return Response.json(
      data(
        {
          success: false,
          message: "Unable to find receipt details for your item.",
        },
        { status: 400 }
      )
    );
  }
  const verifiedItemStatus = await verifyDraftItemStatus(
    draftItemId,
    "pending"
  );
  if (!verifiedItemStatus) {
    return Response.json(
      data(
        {
          success: false,
          message: "Please review the accuracy of the provided details.",
        },
        { status: 400 }
      )
    );
  }

  //otherwise get product image if exists and upload it, returning url
  const productImageFile: File | null = formData.get("productImage") as File;
  const productImageUrl = productImageFile
    ? (await uploadFiles([productImageFile], "plu"))[0]
    : null;
  const createItemData = JSON.parse(formData.get("itemData") as string);

  const createdIds = await createNewReceiptItemPriceEntry(
    receiptInfo,
    createItemData,
    user.id,
    productImageUrl,
    draftItemId
  );

  return Response.json(
    data(
      {
        success: true,
        message: "A new item was created, thank you for contributing!",
        result: { ...createdIds },
      },
      { status: 200 }
    )
  );
}

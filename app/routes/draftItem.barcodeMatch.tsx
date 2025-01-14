import { data, type ActionFunctionArgs } from "react-router";
import { priceEntries, productReceiptIdentifiers } from "~/db/schema";
import { checkAuth } from "~/services/auth.server";
import { addNewPriceEntry } from "~/services/price.server";
import {
  addProductReceiptTextIdentifier,
  completeProductDraftItem,
  verifyDraftItemStatus,
} from "~/services/product.server";
import { getReceiptByID } from "~/services/receipt.server";

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
  const productId = Number(formData.get("productId"));
  const price = Number(formData.get("price"));
  const itemReceiptText = formData.get("receiptText")?.toString();

  if (
    isNaN(receiptId) ||
    isNaN(draftItemId) ||
    isNaN(productId) ||
    isNaN(price) ||
    !price ||
    !itemReceiptText
  ) {
    return Response.json(
      data({ success: false, message: "Critical item details are missing." }),
      { status: 400 }
    );
  }

  // verifies user permission to refer to receipt as well as it's existance
  const receiptInfo = await getReceiptByID(receiptId, user.id);
  if (receiptInfo === null) {
    return Response.json(
      data({
        success: false,
        message: "Unable to find receipt details for your item.",
      }),
      { status: 404 }
    );
  }
  const verifiedItemStatus = await verifyDraftItemStatus(
    draftItemId,
    "pending"
  );
  if (!verifiedItemStatus) {
    return Response.json(
      data({
        success: false,
        message: "Please review the accuracy of the provided details.",
      }),
      { status: 400 }
    );
  }

  const priDetails: typeof productReceiptIdentifiers.$inferInsert = {
    storeBrandName: receiptInfo.storeBrandName,
    productId: productId,
    receiptIdentifier: itemReceiptText,
  };
  addProductReceiptTextIdentifier(priDetails).catch((error: any) =>
    console.error(
      "Background product receipt identification tag failed for productId:",
      productId,
      error
    )
  );
  const priceEntryDetails: typeof priceEntries.$inferInsert = {
    contributorId: user.id,
    productId: productId,
    price: price,
    date: receiptInfo.purchaseDate,
    proof: receiptInfo.imageUrl,
    storeLocation: receiptInfo.storeLocation,
    entrySource: "receipt",
    receiptId: receiptId,
  };

  const priceEntry = await addNewPriceEntry(priceEntryDetails);
  if (priceEntry) {
    completeProductDraftItem(draftItemId, productId);
    return Response.json(
      data({
        success: true,
        message: "A new item was created, thank you for contributing!",
        result: { priceEntry },
      }),
      { status: 200 }
    );
  }
  return Response.json(
    data({
      success: false,
      message: "Error Adding Price",
      result: { priceEntry },
    }),
    { status: 500 }
  );
}

import { data, type ActionFunctionArgs } from "react-router";
import { priceEntries } from "~/db/schema";
import { checkAuth } from "~/services/auth.server";
import { addNewPriceEntry } from "~/services/price.server";
import {
  completeProductDraftItem,
  verifyDraftItemStatus,
} from "~/services/product.server";
import { getReceiptByID } from "~/services/receipt.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await checkAuth(request);
  if (!user)
    return data(
      { success: false, message: "Authentication Failure" },
      { status: 401 }
    );

  const formData = await request.formData();
  const receiptId = Number(formData.get("receiptId"));
  const draftItemId = Number(formData.get("draftItemId"));
  const productId = Number(formData.get("productId"));
  const price = Number(formData.get("price"));

  if (
    isNaN(receiptId) ||
    isNaN(draftItemId) ||
    isNaN(productId) ||
    !price ||
    isNaN(price)
  ) {
    return data(
      { success: false, message: "Critical item details are missing." },
      { status: 400 }
    );
  }

  // verifies user permission to refer to receipt as well as it's existance
  const receiptInfo = await getReceiptByID(receiptId, user.id);
  if (receiptInfo === null) {
    return data(
      {
        success: false,
        message: "Unable to find receipt details for your item.",
      },
      { status: 404 }
    );
  }
  const verifiedItemStatus = await verifyDraftItemStatus(
    draftItemId,
    "pending"
  );
  if (!verifiedItemStatus) {
    return data(
      {
        success: false,
        message: "Please review the accuracy of the provided details.",
      },
      { status: 400 }
    );
  }

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
    completeProductDraftItem(draftItemId);
    return data(
      {
        success: true,
        message: "A new item was created, thank you for contributing!",
        result: { priceEntry },
      },
      { status: 200 }
    );
  }
  return data(
    {
      success: false,
      message: "Error Adding Price",
      result: { priceEntry },
    },
    { status: 500 }
  );
}

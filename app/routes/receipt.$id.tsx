import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { Link, useLoaderData } from "react-router";
import { useState } from "react";
import { requireAuth } from "../services/auth.server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import HeaderLinks from "~/components/custom/HeaderLinks";
import { getReceiptDetails } from "~/services/receipt.server";
import { draftItems, products, receipts } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import ReceiptItemProcessor from "~/components/custom/receipt/ReceiptItemProcessor";
import { CompletedItemsList } from "~/components/custom/receipt/CompletedItemsList";
import { IgnoredItemsList } from "~/components/custom/receipt/IgnoredItemsList";
import MatchedItemsList from "~/components/custom/receipt/MatchedItemsList";
import { getAllReceiptProducts } from "~/services/product.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Review Receipt Prices" },
    {
      name: "description",
      content: "Review the Prices of Items Detected in a Receipt you Uploaded",
    },
  ];
};

type ReceiptData = {
  receipt: typeof receipts.$inferSelect;
  receiptItems: (typeof draftItems.$inferSelect)[];
  matchedDraftProductsPromise: Promise<(typeof products.$inferInsert)[]>;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireAuth(request, `/receipt/${params.id}`);
  // else return receipt. but first check if user is owner of the receipt. otherwise redirect to receipt upload page
  const receiptResult = await getReceiptDetails(parseInt(params.id!), user.id);
  if (!receiptResult) throw redirect("/upload-receipt");
  else {
    const matchedProductIDs = receiptResult.receiptItems
      .filter((item) => item.status === "matched")
      .map((item) => item.productId!);
    const matchedDraftProductsPromise = getAllReceiptProducts(
      parseInt(params.id!),
      matchedProductIDs
    );
    return {
      receipt: receiptResult.receipt,
      receiptItems: receiptResult.receiptItems,
      matchedDraftProductsPromise,
    };
  }
};

export default function ReceiptPage() {
  const { receipt, receiptItems, matchedDraftProductsPromise } =
    useLoaderData<typeof loader>();

  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <Link to={"/"}>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </Link>
            <BreadcrumbSeparator />
            <Link to={"/account"}>
              <BreadcrumbLink>Account</BreadcrumbLink>
            </Link>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Receipt Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <ReceiptReview
          receipt={JSON.parse(JSON.stringify(receipt))}
          receiptItems={JSON.parse(JSON.stringify(receiptItems))}
          matchedDraftProductsPromise={matchedDraftProductsPromise}
        />
      </div>
    </div>
  );
}

const ReceiptReview = (props: ReceiptData) => {
  const { receipt, receiptItems, matchedDraftProductsPromise } = props;

  // Helper function to safely format receipt date with fallback to createdAt
  const formatReceiptDate = (purchaseDate: string, createdAt: string): string => {
    const date = new Date(purchaseDate);
    // Check if date is valid
    if (!isNaN(date.getTime()) && purchaseDate && purchaseDate !== "") {
      return date.toLocaleDateString();
    }
    // Fallback to createdAt
    const fallbackDate = new Date(createdAt);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toLocaleDateString();
    }
    // Last resort fallback
    return new Date().toLocaleDateString();
  };

  const handleIgnoreItem = async (
    itemId: number,
    currentStatus: typeof draftItems.$inferSelect.status
  ) => {
    updateItemStatus(itemId, currentStatus, "ignored");

    const formData = new FormData();
    formData.append("id", itemId.toString());
    await fetch(`/draftItem/ignore`, {
      method: "POST",
      body: formData,
    }).catch((error) => console.error("Failed to send ignore request:", error));
  };
  const [itemsByStatus, setItemsByStatus] = useState(() => {
    const groups = {
      pending: [] as (typeof draftItems.$inferSelect)[],
      matched: [] as (typeof draftItems.$inferSelect)[],
      completed: [] as (typeof draftItems.$inferSelect)[],
      ignored: [] as (typeof draftItems.$inferSelect)[],
    };

    receiptItems.forEach((item) => {
      groups[item.status].push(item);
    });

    return groups;
  });

  const updateItemStatus = (
    itemId: number,
    oldStatus: typeof draftItems.$inferSelect.status,
    newStatus: typeof draftItems.$inferSelect.status
  ) => {
    setItemsByStatus((prevGroups) => {
      const newGroups = {
        pending: [...prevGroups.pending],
        matched: [...prevGroups.matched],
        completed: [...prevGroups.completed],
        ignored: [...prevGroups.ignored],
      };

      const index = newGroups[oldStatus].findIndex(
        (item) => item.id === itemId
      );
      if (index !== -1) {
        const [item] = newGroups[oldStatus].splice(index, 1);
        item.status = newStatus;
        newGroups[newStatus].push(item);
      }

      return newGroups;
    });
  };

  const ReceiptSummary = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Receipt Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Store</p>
            <p>{receipt.storeBrandName || "Unknown Store"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p>{formatReceiptDate(receipt.purchaseDate, receipt.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p>${receipt.totalAmount?.toFixed(2) || "0.00"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Items</p>
            <p>{receiptItems.length} prices found</p>
          </div>
        </div>
        {receipt.imageUrl && (
          <div className="mt-4">
            <div
              className="max-h-[200px] overflow-y-auto cursor-zoom-in hover:shadow-lg transition-shadow duration-300 relative"
              onClick={() => window.open(receipt.imageUrl, "_blank")}
            >
              <div className=" right-2 top-0 bg-black/50 text-white px-2 py-1  text-sm z-10 sticky">
                Scroll to view more
              </div>
              <img
                src={receipt.imageUrl}
                alt="Receipt"
                className="max-w-full h-auto object-contain"
                style={{ marginTop: "-28px" }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <ReceiptSummary />

      <div className="space-y-8">
        <MatchedItemsList
          items={itemsByStatus.matched}
          matchedDraftProductsPromise={matchedDraftProductsPromise}
          onIgnore={handleIgnoreItem}
          onQuantitySubmit={async (itemId: number, quantityPrice: number) => {
            const item = itemsByStatus.matched.find((i) => i.id === itemId);
            if (!item) return;

            const formData = new FormData();
            formData.append("productId", item.productId!.toString());
            formData.append("draftItemId", itemId.toString());
            formData.append("price", quantityPrice.toString());
            formData.append("receiptId", receipt.id.toString());

            try {
              await fetch("/draftItem/verifyQuantity", {
                method: "POST",
                body: formData,
              });
              updateItemStatus(itemId, item.status, "completed");
            } catch (error) {
              console.error("Failed to submit quantity:", error);
              // TODO: show error toast
            }
          }}
        />
        {itemsByStatus.pending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Items</h2>
            {itemsByStatus.pending.map((item) => (
              <ReceiptItemProcessor
                item={item}
                key={item.id}
                imageUrl={receipt.imageUrl}
                storeBrand={receipt.storeBrandName}
                onSubmit={async (createItemData) => {
                  // New Item
                  const { productImage, ...itemData } = createItemData;
                  const formData = new FormData();

                  // Add the item data as a single JSON string
                  formData.append("itemData", JSON.stringify(itemData));

                  // Add image if it exists
                  if (productImage) {
                    formData.append("productImage", productImage);
                  }

                  // Add essential IDs separately for easier server-side processing
                  formData.append("receiptId", receipt.id.toString());
                  formData.append("draftItemId", item.id.toString());

                  try {
                    await fetch("/draftItem/create", {
                      method: "POST",
                      body: formData,
                    });
                    updateItemStatus(item.id, item.status, "completed");
                  } catch (error) {
                    console.error("Failed to process receipt item:", error);
                    // TODO: show error toast
                  }
                }}
                onIgnore={() => handleIgnoreItem(item.id, item.status)}
                onReceiptTextMatch={async (productId, quantityPrice) => {
                  // if found after fixing receipt text:
                  // just do priceEntry for productId of the right receipt text
                  const formData = new FormData();
                  formData.append("productId", productId.toString());
                  formData.append("draftItemId", item.id.toString());
                  formData.append("receiptId", receipt.id.toString());
                  formData.append("price", quantityPrice.toString());
                  try {
                    const response = await fetch(
                      "/draftItem/receiptTextMatch",
                      {
                        method: "POST",
                        body: formData,
                      }
                    );
                    await response.json();
                    updateItemStatus(item.id, item.status, "completed");
                  } catch (error) {
                    console.error("Failed to process receipt item:", error);
                    // TODO: show error toast
                  }
                }}
                onBarcodeMatch={async (productId, quantityPrice) => {
                  // if found after UPC found:
                  // Link future receipt texts with this productId (and do priceEntry)
                  const formData = new FormData();
                  formData.append("productId", productId.toString());
                  formData.append("draftItemId", item.id.toString());
                  formData.append("receiptId", receipt.id.toString());
                  formData.append("receiptText", item.receiptText);
                  formData.append("price", quantityPrice.toString());

                  try {
                    const response = await fetch("/draftItem/barcodeMatch", {
                      method: "POST",
                      body: formData,
                    });
                    await response.json();
                    updateItemStatus(item.id, item.status, "completed");
                  } catch (error) {
                    console.error("Failed to process receipt item:", error);
                    // TODO: show error toast
                  }
                }}
                onProductMismatch={async (upc, description) => {
                  // Send an edit request
                  const formData = new FormData();

                  formData.append("upc", upc);

                  const editNotes = `receipt id: ${receipt.id}; draftItemId: ${item.id}; user description: ${description}`;
                  formData.append("editNotes", editNotes);
                  formData.append("draftItemId", item.id.toString());

                  try {
                    await fetch("/draftItem/editRequest", {
                      method: "POST",
                      body: formData,
                    });
                    updateItemStatus(item.id, item.status, "completed");
                  } catch (error) {
                    console.error(
                      "Failed to submit edit request for review: ",
                      error
                    );
                    // TODO: show error toast
                  }
                }}
              />
            ))}
          </div>
        )}

        <CompletedItemsList items={itemsByStatus.completed} />
        <IgnoredItemsList items={itemsByStatus.ignored} />
      </div>
    </div>
  );
};

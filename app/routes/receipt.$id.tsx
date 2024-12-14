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
import { draftItems, receipts } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import ReceiptItemProcessor from "~/components/custom/receipt/ReceiptItemProcessor";

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
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireAuth(request, `/receipt/${params.id}`);
  // else return receipt. but first check if user is owner of the receipt. otherwise redirect to receipt upload page
  const result = await getReceiptDetails(parseInt(params.id!), user.id);
  if (!result) throw redirect("/upload-receipt");
  else {
    return { receipt: result.receipt, receiptItems: result.receiptItems };
  }
};

export default function ReceiptPage() {
  const { receipt, receiptItems } = useLoaderData<typeof loader>();

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
        />
      </div>
    </div>
  );
}

const ReceiptReview = (props: ReceiptData) => {
  const { receipt, receiptItems } = props;
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
            <p>{new Date(receipt.purchaseDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p>${receipt.totalAmount?.toFixed(2) || "0.00"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Items</p>
            <p>{receiptItems.length} items</p>
          </div>
        </div>
        {receipt.imageUrl && (
          <div className="mt-4">
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <ReceiptSummary />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Receipt Items</h2>
        {itemsByStatus.pending.map((item) => (
          <ReceiptItemProcessor
            item={item}
            key={item.id}
            imageUrl={receipt.imageUrl}
            storeBrand={receipt.storeBrandName}
            onSubmit={async (createItemData) => {
              console.log("Firing submit event");
              console.log(createItemData);
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
                console.log(
                  "Completed the creation of priceEntry, product, and RTI for item ",
                  item.id
                );
              } catch (error) {
                console.error("Failed to process receipt item:", error);
                // TODO: show error toast
              }
            }}
            onIgnore={async () => {
              console.log("Starting the ignore");
              updateItemStatus(item.id, item.status, "ignored");

              const formData = new FormData();
              formData.append("id", item.id.toString());
              await fetch(`/draftItem/ignore`, {
                method: "POST",
                body: formData,
              }).catch((error) =>
                console.error("Failed to send ignore request:", error)
              );
              console.log("Completed the ignore for item ", item.id);
            }}
            onReceiptTextMatch={async (productId, quantityPrice) => {
              // if matched after fixing receipt text:
              // just do priceEntry for productId of the right receipt text
              const formData = new FormData();
              formData.append("productId", productId.toString());
              formData.append("draftItemId", item.id.toString());
              formData.append("receiptId", receipt.id.toString());
              formData.append("price", quantityPrice.toString());
              try {
                const response = await fetch("/draftItem/barcodeMatch", {
                  method: "POST",
                  body: formData,
                });
                await response.json();
                updateItemStatus(item.id, item.status, "completed");
                console.log(
                  "Completed the creation of priceEntry and link of receipt for item ",
                  item.id
                );
              } catch (error) {
                console.error("Failed to process receipt item:", error);
                // TODO: show error toast
              }
            }}
            onBarcodeMatch={async (productId, quantityPrice) => {
              // if matched after UPC found:
              // Link future receipt texts with this productId (and do priceEntry)
              const formData = new FormData();
              formData.append("productId", productId.toString());
              formData.append("draftItemId", item.id.toString());
              formData.append("receiptId", receipt.id.toString());
              formData.append("receiptText", item.receiptText);
              formData.append("price", quantityPrice.toString());

              // we need to find out if it's weighted (if so, mark it matched otherwise completed && include price entry)
              try {
                const response = await fetch("/draftItem/barcodeMatch", {
                  method: "POST",
                  body: formData,
                });
                await response.json();
                updateItemStatus(item.id, item.status, "completed");
                console.log(
                  "Completed the creation of priceEntry and link of receipt for item ",
                  item.id
                );
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
    </div>
  );
};

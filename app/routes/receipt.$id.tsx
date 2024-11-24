import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { requireAuth } from "../services/auth.server";
import { X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
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

type LoaderData = {
  receipt: typeof receipts.$inferSelect;
  receiptItems: (typeof draftItems.$inferSelect)[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireAuth(request);
  // else return receipt. but first check if user is owner of the receipt. otherwise redirect to receipt upload page
  const result = await getReceiptDetails(parseInt(params.id!), user.id);
  if (!result) return redirect("/upload-receipt");
  else {
    return json({ receipt: result.receipt, receiptItems: result.receiptItems });
  }
};

export default function ReceiptPage() {
  const { receipt, receiptItems } = useLoaderData<LoaderData>();

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

const ReceiptReview = (props: LoaderData) => {
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

  const StatusBadge = ({
    status,
  }: {
    status: typeof draftItems.$inferSelect.status;
  }) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      matched: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      ignored: "bg-gray-100 text-gray-800",
    };

    let StatusIcon;
    switch (status) {
      case "pending":
        StatusIcon = Clock;
        break;
      case "matched":
        StatusIcon = AlertCircle;
        break;
      case "completed":
        StatusIcon = CheckCircle2;
        break;
      case "ignored":
        StatusIcon = X;
        break;
      default:
        StatusIcon = AlertCircle;
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
      >
        <StatusIcon className="w-4 h-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const QuantityInput = ({
    draftItem,
  }: {
    draftItem: typeof draftItems.$inferInsert;
  }) => {
    const [quantity, setQuantity] = useState(draftItem.unitQuantity || 1);

    const handleSubmit = async () => {
      // TODO: Implement API call to create price entry and mark draft item complete
      // createPriceEntry({ ...draftItem, quantity });
      // markDraftItemComplete(draftItem.id);
    };

    return (
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24"
          min="0"
          step="0.01"
        />
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
    );
  };

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
            onQuantityUpdate={async () => {
              // WIP: Handle quantity updates for matched items
            }}
          />
        ))}
      </div>
    </div>
  );
};

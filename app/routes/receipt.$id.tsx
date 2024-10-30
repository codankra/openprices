import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
} from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { auth } from "../services/auth.server";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { draftItems, receipts, UnitType } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

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
  const user = await auth.isAuthenticated(request);
  if (!user) return redirect("/login");
  // else return receipt. but first check if user is owner of the receipt. otherwise redirect to receipt upload page
  const result = await getReceiptDetails(parseInt(params.id!), user.id);
  if (!result) return redirect("/upload-receipt");
  else {
    return json({ receipt: result.receipt, receiptItems: result.receiptItems });
  }
};

export default function ReceiptPage() {
  const { id } = useParams();
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
              <BreadcrumbPage>Receipt History </BreadcrumbPage>
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
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unitQty: 0,
    unitType: "COUNT",
    productBrandName: "",
  });

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

  const NewProductForm = ({
    draftItem,
  }: {
    draftItem: typeof draftItems.$inferInsert;
  }) => {
    const handleSubmit = async () => {
      // TODO: Implement API calls to:
      // 1. Create new product
      // 2. Create price entry
      // 3. Create product receipt identifier
      // 4. Mark draft item as complete
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Create Product</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                defaultValue={draftItem.receiptText}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, category: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitQty">Unit Quantity</Label>
                <Input
                  id="unitQty"
                  type="number"
                  value={newProduct.unitQty}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unitQty: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitType">Unit Type</Label>
                <Select
                  value={newProduct.unitType}
                  onValueChange={(value) =>
                    setNewProduct({ ...newProduct, unitType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UnitType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSubmit}>Create Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const DraftItemCard = ({
    item,
  }: {
    item: typeof draftItems.$inferSelect;
  }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{item.receiptText}</p>
            <p className="text-sm text-gray-500">
              Price: ${item.price.toFixed(2)}
              {item.unitPrice &&
                ` (${item.unitPrice.toFixed(2)} x ${item.unitQuantity})`}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="mt-4">
          {item.status === "matched" && <QuantityInput draftItem={item} />}
          {item.status === "pending" && <NewProductForm draftItem={item} />}
          {item.status === "completed" && (
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Processed</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <ReceiptSummary />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Receipt Items</h2>
        {receiptItems.map((item) => (
          <DraftItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

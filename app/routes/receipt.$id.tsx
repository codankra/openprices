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
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
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
import { draftItems, receipts } from "~/db/schema";

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

export default function UploadReceipt() {
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

        <p>Receipt {id} Job Summary</p>
        {JSON.stringify(receipt, null, 2)}
        <p>Receipt Draft Items</p>
        {JSON.stringify(receiptItems, null, 2)}

        <p>Complete Receipt Button</p>
      </div>
    </div>
  );
}

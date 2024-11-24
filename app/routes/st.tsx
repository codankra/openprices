import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { requireAuth } from "../services/auth.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import BarcodeScanner from "~/components/custom/product/CaptureBarcode";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  return user;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Open Price Dashboard" },
    { name: "description", content: "Scan a new Price Item" },
  ];
};

export default function ContributorProfile() {
  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div>
        <h1 className="text-center text-2xl font-bold">
          Barcode & PLU Scanner
        </h1>
        <BarcodeScanner />
      </div>
    </div>
  );
}

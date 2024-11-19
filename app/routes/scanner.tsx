import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { auth } from "../services/auth.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import BarcodeScanner from "~/components/custom/product/barcode";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }
  return json({ user });
};

export const meta: MetaFunction = () => {
  return [
    { title: "Open Price Dashboard" },
    { name: "description", content: "Scan a new Price Item" },
  ];
};

export default function ContributorProfile() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div>
        <h1>Barcode & PLU Scanner</h1>
        <BarcodeScanner />
      </div>{" "}
    </div>
  );
}

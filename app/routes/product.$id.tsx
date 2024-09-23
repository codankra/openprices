import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { redirect, defer } from "@remix-run/node";
import { Await, Form, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { getPriceEntriesByProductID } from "~/services/price.server";
import {
  getProductAndBrandByID,
  getProductById,
} from "~/services/product.server";
export const loader: LoaderFunction = async ({ params }) => {
  const priceEntries = getPriceEntriesByProductID(params.id!); //intentionally stream
  const product = await getProductAndBrandByID(params.id!);
  if (!product) return redirect("/productNotFound");
  return defer({ product, priceEntries });
};

export const meta: MetaFunction = () => {
  return [
    { title: "Price History: Product" },
    { name: "description", content: "Your User Section of Open Price Data" },
  ];
};

export default function Dashboard() {
  const { product, priceEntries } = useLoaderData<typeof loader>();
  return (
    <div className="font-sans p-4 bg-gradient-to-b from-[#f7f2ec] to-[#efebe7] min-h-screen">
      <h1 className="text-3xl">
        How have Prices Really Changed? Explore Crowdsourced Data
      </h1>
      <div className="card">Contribute</div>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/quickstart"
            rel="noreferrer"
          >
            You made it to the dashboard!!
          </a>
        </li>
        <li>
          <Form method="post" action="/logout">
            <button type="submit">Log Out</button>
          </Form>
        </li>
      </ul>
    </div>
  );
}

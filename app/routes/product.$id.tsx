import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { redirect, defer } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { getPriceEntriesByProductID } from "~/services/price.server";
import { getProductAndBrandByID } from "~/services/product.server";

type LoaderData = {
  product: Awaited<ReturnType<typeof getProductAndBrandByID>>;
  priceEntries: ReturnType<typeof getPriceEntriesByProductID>;
};

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const productPromise = getProductAndBrandByID(params.id!);
    const priceEntriesPromise = getPriceEntriesByProductID(params.id!);

    const product = await productPromise;
    if (!product) return redirect("/productNotFound");

    return defer({
      product,
      priceEntries: priceEntriesPromise,
    });
  } catch (error) {
    console.error("Error in loader:", error);
    throw new Response("Error loading data", { status: 500 });
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "Product Price History" },
    { name: "description", content: "Open Price History of Your Product" },
  ];
};

export default function ProductPage() {
  const { product, priceEntries } = useLoaderData<LoaderData>();
  return (
    <div className="font-sans p-4 bg-stone-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold mb-4 text-stone-900">
          {product?.productInfo.name}
        </h1>
        <p className="text-stone-600 mb-2">Brand: {product?.brandInfo?.name}</p>
        <p className="text-stone-600 mb-4">
          Price: {product?.productInfo.latestPrice}
        </p>
        <p className="text-lg font-semibold text-stone-800">
          Description: {product?.productInfo.category}
        </p>
      </div>
      <h2 className="text-2xl font-bold mb-4 text-stone-900">Price History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Suspense
          fallback={
            <div className="text-stone-700">Loading price entries...</div>
          }
        >
          <Await
            resolve={priceEntries}
            errorElement={<div>Error loading price entries</div>}
          >
            {(resolvedPriceEntries) => {
              if (!resolvedPriceEntries || resolvedPriceEntries.length === 0) {
                return (
                  <div className="text-stone-700">No price entries found</div>
                );
              }
              return resolvedPriceEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg shadow-md p-4"
                >
                  <p className="text-xl font-bold mb-2 text-stone-900">
                    ${entry.price.toFixed(2)}
                  </p>
                  <p className="text-stone-600">
                    Date: {new Date(entry.date).toLocaleDateString()}
                  </p>
                  <p className="text-stone-600">Store: {entry.storeLocation}</p>
                </div>
              ));
            }}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

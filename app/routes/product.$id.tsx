import { PiCaretDoubleDown, PiCaretDoubleUp } from "react-icons/pi";
import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { redirect, defer } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";
import { Suspense, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  CollapsibleTrigger,
  Collapsible,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import { getPriceEntriesByProductID } from "~/services/price.server";
import { getProductAndBrandByID } from "~/services/product.server";
import PriceChart from "~/components/custom/PriceEntryChart";
type LoaderData = {
  product: Awaited<ReturnType<typeof getProductAndBrandByID>>;
  priceEntries: Awaited<ReturnType<typeof getPriceEntriesByProductID>>;
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

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const productName = data.product.productInfo.name;
  return [
    { title: `${productName} - Open Price History` },
    { name: "description", content: "Open Price History of Your Product" },
  ];
};

export default function ProductPage() {
  const { product, priceEntries } = useLoaderData<LoaderData>();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const p = product!.productInfo;
  const priceUnitString = p.unitPricing
    ? `/${p.unitType}`
    : `(\$${((p.latestPrice ?? 0) / (p.unitQty ?? 1))?.toFixed(2)}/${
        p.unitType
      })`;
  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header className="bg-stone-300 text-stone-900 self-start py-4 mb-4 border-stone-800 border-b-2 flex justify-between">
        <div className="flex items-center container mx-auto hover:text-stone-700 ">
          <Link to="/" className="flex items-center space-x-4">
            <img
              src="/favicon.ico"
              width={40}
              height={40}
              alt="Open Price Data Logo"
              className="rounded"
            />
            <h1 className="text-2xl font-bold">Open Price Data</h1>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="flex items-center">
          {product?.productInfo.image && (
            <img
              src={product.productInfo.image}
              alt={product.productInfo.name}
              className="w-32 h-32 object-cover rounded-lg mr-6"
            />
          )}
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-stone-700">
              {product?.productInfo.name}
            </h1>
            {p.latestPrice && (
              <p className="text-stone-800 mb-2 ">
                <span className="text-2xl mr-1 font-bold">
                  ${product?.productInfo.latestPrice?.toFixed(2)}
                </span>
                <span className="text-lg text-stone-600">
                  {priceUnitString}
                </span>
              </p>
            )}
          </div>
        </div>{" "}
        <Collapsible
          open={isDetailsExpanded}
          onOpenChange={setIsDetailsExpanded}
          className="w-full mx-auto flex flex-col items-center"
        >
          {!isDetailsExpanded && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="text-stone-600 mt-4"
                size={"sm"}
              >
                <span className="mr-2 text-sm">View Details</span>
                <PiCaretDoubleDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          )}
          <CollapsibleContent className="w-full mx-auto p-6">
            <div className="w-full md:w-96 mx-auto border border-stone-300 rounded-lg p-4">
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-2 mb-2">
                <span className="text-stone-600 ml-1">Category:</span>
                <span className="text-stone-800 font-medium mr-1">
                  {product?.productInfo.category || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-2 mb-2">
                <span className="text-stone-600 ml-1">Views:</span>
                <span className="text-stone-800 font-medium mr-1">{"-"}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-2 mb-2">
                <span className="text-stone-600 ml-1">Price Records:</span>
                <span className="text-stone-800 font-medium mr-1">
                  {priceEntries?.length || "-"}
                </span>
              </div>

              {product?.brandInfo?.name && (
                <div className="flex justify-between border-b border-dashed border-stone-300 pb-2 mb-2">
                  <span className="text-stone-600 self-end ml-1">Brand:</span>
                  {product?.brandInfo?.image ? (
                    <img
                      src={product.brandInfo.image}
                      alt={product.brandInfo.name}
                      className="w-24 h-24 object-contain rounded-lg mr-1"
                    />
                  ) : (
                    <span className="text-stone-800 font-medium mr-1">
                      {product?.brandInfo?.name}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-stone-600 ml-1">Type:</span>
                <span className="text-stone-800 font-medium mr-1">
                  {product?.brandInfo?.isStoreOwner
                    ? "Store Brand"
                    : "Distributed"}
                </span>
              </div>
            </div>
          </CollapsibleContent>
          {isDetailsExpanded && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="text-stone-600">
                <span className="mr-2">Hide Details</span>
                <PiCaretDoubleUp className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </div>

      <div className="max-w-4xl mx-auto pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-stone-900">Price History</h2>
          <Button asChild className="bg-ogfore hover:bg-ogfore-hover">
            <Link
              to={`/price-entry?existingProductId=${product?.productInfo.id}`}
              className="text-lg"
            >
              Add Price
            </Link>
          </Button>
        </div>
        <div className="flex flex-col ">
          <Suspense
            fallback={
              <div className="text-stone-700">Loading price entries...</div>
            }
          >
            <Await
              resolve={priceEntries}
              errorElement={<div>Error loading price entries</div>}
            >
              {(resolvedPriceEntries) => (
                <>
                  {(!resolvedPriceEntries ||
                    resolvedPriceEntries.length === 0) && (
                    <div className="text-stone-700">No price entries found</div>
                  )}
                  {resolvedPriceEntries.length > 1 && (
                    <PriceChart priceEntries={resolvedPriceEntries} />
                  )}
                  {resolvedPriceEntries.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resolvedPriceEntries.map((entry) => (
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
                          <p className="text-stone-600">
                            Store: {entry.storeLocation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Await>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

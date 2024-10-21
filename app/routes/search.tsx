import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useState } from "react";
import HeaderLinks from "~/components/custom/HeaderLinks";
import ProductDetailsCard from "~/components/custom/ProductDetailsCard";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { products } from "~/db/schema";
import { ProductPreview, products as trendingProducts } from "~/lib/data";
import { debounce } from "~/lib/utils";
import { getProductsBySearch } from "~/services/product.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Search Prices of Products" },
    {
      name: "description",
      content: "Search Price History of Products on Open Price Data",
    },
  ];
};
type LoaderData = {
  trendingProducts: ProductPreview[];
  searchResults: (typeof products.$inferSelect)[];
};
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("q") || "";
  let searchResults: (typeof products.$inferSelect)[] = [];
  if (searchTerm.length > 1) {
    searchResults = await getProductsBySearch(searchTerm);
  }
  return json<LoaderData>({ trendingProducts, searchResults });
};

export default function ProductSearch() {
  const { trendingProducts, searchResults } = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("q", term);
        return newParams;
      });
    }, 300),
    [setSearchParams]
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      debouncedSearch(term);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-ogprime w-full">
        <HeaderLinks />
      </header>

      <main className="h-full flex-grow bg-ogprime">
        <section className="py-8 px-6 rounded-md shadow-sm  max-w-6xl mx-auto ">
          <div id="search-bar" className="relative">
            <Input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Open Price Data"
              className="mt-2 bg-white w-full border-2 focus-visible:border-2 focus-visible:border-ogfore  focus-visible:ring-ogfore  text-lg py-5 pl-10 pr-4 rounded-lg shadow-lg"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((product) => (
                <Link
                  to={`/product/${product.id}`}
                  key={product.id}
                  className="bg-white border border-stone-200 rounded-md p-4 cursor-pointer hover:bg-stone-50 transition duration-150 ease-in-out"
                  onClick={() => {
                    setSearchTerm(product.name);
                  }}
                >
                  <h3 className="font-bold text-stone-800">{product.name}</h3>
                  <p className="text-stone-600">
                    Price: ${product.latestPrice?.toFixed(2)}
                  </p>
                  <p className="text-stone-500">Category: {product.category}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="py-8 ">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Trending Prices
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              {trendingProducts.map((product) => (
                <ProductDetailsCard product={product} key={product.id} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-stone-800 text-white py-8 flex">
        <div className="container mx-auto px-4 text-center">
          <p>
            &copy; {new Date().getFullYear()} Daniel Kramer. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { useCallback, useState } from "react";
import HeaderLinks from "~/components/custom/HeaderLinks";
import ProductDetailsCard from "~/components/custom/ProductDetailsCard";
import { Input } from "~/components/ui/input";
import { products } from "~/db/schema";
import { products as trendingProducts } from "~/lib/data";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("q") || "";
  let searchResults: (typeof products.$inferSelect)[] = [];
  if (searchTerm.length > 1) {
    searchResults = await getProductsBySearch(searchTerm);
  }
  return { trendingProducts, searchResults };
};

export default function ProductSearch() {
  const { trendingProducts, searchResults } = useLoaderData<typeof loader>();
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
        <section className="py-8 px-6 rounded-md max-w-6xl mx-auto ">
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
                  className="bg-white border border-stone-200 rounded-md p-4 cursor-pointer hover:bg-stone-50 hover:shadow-lg hover:scale-[1.02] hover:border-ogfore transition-all duration-150 ease-in-out h-[160px] flex flex-col shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-stone-800 text-left line-clamp-3 leading-tight">
                      {product.name}
                    </h3>
                    {product.latestPrice && (
                      <span className="font-semibold text-stone-600 whitespace-nowrap ml-2">
                        ${product.latestPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    {product.productBrandName && (
                      <p className="text-stone-500 truncate leading-tight">
                        {product.productBrandName}
                      </p>
                    )}
                  </div>
                  <div className="text-stone-500 truncate leading-tight mt-auto">
                    {product.unitQty} {product.unitType}
                  </div>
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

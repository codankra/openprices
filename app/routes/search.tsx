import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { useCallback, useState } from "react";
import HeaderLinks from "~/components/custom/HeaderLinks";
import ProductDetailsCard from "~/components/custom/ProductDetailsCard";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { products } from "~/db/schema";
import { products as trendingProducts } from "~/lib/data";
import { debounce } from "~/lib/utils";
import { getProductsBySearch } from "~/services/product.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Search - Open Price Database" },
    {
      name: "description",
      content:
        "Search the price history of foods on the Open Price Data CPI Pal database",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("q") || "";
  const brands = url.searchParams.getAll("brands").filter(Boolean);
  const priceFilterType = url.searchParams.get("priceType") as
    | "unknown"
    | "range"
    | null;
  const minPriceParam = url.searchParams.get("minPrice");
  const maxPriceParam = url.searchParams.get("maxPrice");

  let searchResults: (typeof products.$inferSelect)[] = [];

  if (searchTerm.length > 1) {
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    searchResults = await getProductsBySearch(searchTerm, 12, {
      brandFilters: brands.length > 0 ? brands : undefined,
      priceFilterType,
      minPrice,
      maxPrice,
    });
  }

  return {
    trendingProducts,
    searchResults,
    appliedFilters: {
      brands,
      priceFilterType,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
    },
  };
};

export default function ProductSearch() {
  const { trendingProducts, searchResults, appliedFilters } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");

  // Initialize brand filters from URL params
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const brands = appliedFilters.brands || [];
    return brands.filter(
      (brand) => brand === "HEB" || brand === "Trader Joe's"
    );
  });

  // Initialize custom brand from URL params (any brand that's not HEB or Trader Joe's)
  const [customBrand, setCustomBrand] = useState<string>(() => {
    const brands = appliedFilters.brands || [];
    const customBrand = brands.find(
      (brand) => brand !== "HEB" && brand !== "Trader Joe's"
    );
    return customBrand || "";
  });

  // Initialize price filters from URL params
  const [priceFilterType, setPriceFilterType] = useState<
    "unknown" | "range" | null
  >(appliedFilters.priceFilterType || null);
  const [minPrice, setMinPrice] = useState<string>(
    appliedFilters.minPrice || ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    appliedFilters.maxPrice || ""
  );

  // Debounced search function - only for search term
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (term.length > 0) {
          newParams.set("q", term);
        } else {
          newParams.delete("q");
        }
        return newParams;
      });
    }, 300),
    [setSearchParams]
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleBrandChange = (brand: string, checked: boolean) => {
    // Calculate the new brand list
    const newSelectedBrands = checked
      ? [...selectedBrands, brand]
      : selectedBrands.filter((b) => b !== brand);

    // Update state
    setSelectedBrands(newSelectedBrands);

    // Apply filters with the new calculated values, not the state
    // which might not be updated yet
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Clear existing brand params
      newParams.delete("brands");

      // Add selected brands including the update we just made
      [...newSelectedBrands, customBrand].filter(Boolean).forEach((b) => {
        newParams.append("brands", b);
      });

      return newParams;
    });
  };

  const handleCustomBrandChange = (value: string) => {
    // Update state
    setCustomBrand(value);

    // Apply filters with the new value directly
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Clear existing brand params
      newParams.delete("brands");

      // Add all brands including the new custom brand
      [...selectedBrands, value].filter(Boolean).forEach((b) => {
        newParams.append("brands", b);
      });

      return newParams;
    });
  };

  const handlePriceTypeChange = (value: "unknown" | "range") => {
    // Update state
    setPriceFilterType(value);

    // Apply filters with the new value directly
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Update price type
      newParams.set("priceType", value);

      // If switching to range, keep existing min/max values
      if (value === "range") {
        if (minPrice) {
          newParams.set("minPrice", minPrice);
        } else {
          newParams.delete("minPrice");
        }

        if (maxPrice) {
          newParams.set("maxPrice", maxPrice);
        } else {
          newParams.delete("maxPrice");
        }
      } else {
        // If switching to unknown, remove min/max values
        newParams.delete("minPrice");
        newParams.delete("maxPrice");
      }

      return newParams;
    });
  };

  const handlePriceInputChange = (value: string, isMin: boolean) => {
    // Update the appropriate state
    if (isMin) {
      setMinPrice(value);
    } else {
      setMaxPrice(value);
    }

    // Apply filters with the new values directly
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Always set price type to range when price inputs change
      newParams.set("priceType", "range");

      // Update the appropriate price param
      if (isMin) {
        if (value) {
          newParams.set("minPrice", value);
        } else {
          newParams.delete("minPrice");
        }
        // Preserve the other value
        if (maxPrice) {
          newParams.set("maxPrice", maxPrice);
        }
      } else {
        if (value) {
          newParams.set("maxPrice", value);
        } else {
          newParams.delete("maxPrice");
        }
        // Preserve the other value
        if (minPrice) {
          newParams.set("minPrice", minPrice);
        }
      }

      return newParams;
    });
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    setSelectedBrands([]);
    setCustomBrand("");
    setPriceFilterType(null);
    setMinPrice("");
    setMaxPrice("");

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Clear filter params only, preserve search term
      newParams.delete("brands");
      newParams.delete("priceType");
      newParams.delete("minPrice");
      newParams.delete("maxPrice");

      return newParams;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-ogprime w-full">
        <HeaderLinks />
      </header>

      <main className="h-full flex-grow bg-ogprime">
        <section className="py-8 px-6 max-w-6xl mx-auto">
          <div id="search-bar" className="relative mb-6">
            <Input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Open Price Data"
              className="mt-2 bg-white w-full border-2 focus-visible:border-2 focus-visible:border-ogfore focus-visible:ring-ogfore text-lg py-5 pl-10 pr-4 rounded-lg shadow-lg"
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

          {/* Responsive layout for search content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filter panel */}
            <div className="w-full lg:w-1/4 bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-sm text-stone-500 hover:text-stone-700 underline"
                >
                  Clear All
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-md font-semibold mb-2">Brand</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="heb"
                      checked={selectedBrands.includes("HEB")}
                      onCheckedChange={(checked) =>
                        handleBrandChange("HEB", checked as boolean)
                      }
                    />
                    <Label htmlFor="heb">HEB</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="trader-joes"
                      checked={selectedBrands.includes("Trader Joe's")}
                      onCheckedChange={(checked) =>
                        handleBrandChange("Trader Joe's", checked as boolean)
                      }
                    />
                    <Label htmlFor="trader-joes">Trader Joe's</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="custom-brand">Custom:</Label>
                    <Input
                      id="custom-brand"
                      value={customBrand}
                      onChange={(e) => handleCustomBrandChange(e.target.value)}
                      placeholder="Enter a brand"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold mb-2">Latest Price</h3>
                <RadioGroup
                  value={priceFilterType ?? undefined}
                  onValueChange={(value) =>
                    handlePriceTypeChange(value as "unknown" | "range")
                  }
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unknown" id="unknown" />
                    <Label htmlFor="unknown">Unknown</Label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="range" id="range" />
                      <Label htmlFor="range">Price Range:</Label>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) =>
                          handlePriceInputChange(e.target.value, true)
                        }
                        disabled={priceFilterType === "unknown"}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) =>
                          handlePriceInputChange(e.target.value, false)
                        }
                        disabled={priceFilterType === "unknown"}
                        className="w-full"
                      />
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Results area */}
            <div className="w-full lg:w-3/4">
              {searchTerm.length < 2 && (
                <div className="w-full">
                  <div className="bg-white p-6 rounded-lg shadow-md border-x-4 border-ogfore">
                    <div className="flex flex-col items-center">
                      <h3 className="font-semibold text-lg mb-1">
                        Search Results will Appear Here{" "}
                      </h3>
                      <p className="text-stone-600">
                        Enter at least 2 characters to search for grocery and
                        food products.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {searchResults.length > 0 && searchTerm.length > 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((product) => (
                    <Link
                      to={`/product/${product.id}`}
                      key={product.id}
                      className="bg-white border border-stone-200 rounded-md p-4 cursor-pointer hover:bg-stone-50 hover:shadow-lg hover:scale-[1.02] hover:border-ogfore transition-all duration-150 ease-in-out flex flex-col shadow-sm min-h-[200px]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center">
                              <span className="text-stone-500 text-xs">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-stone-800 text-left line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          {product.productBrandName && (
                            <p className="text-lg font-bold text-stone-600 truncate leading-tight mt-1">
                              {product.productBrandName}
                            </p>
                          )}
                          {product.latestPrice ? (
                            <p className="font-semibold text-stone-700 mt-2">
                              ${product.latestPrice.toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-stone-500 italic mt-2">
                              Price unknown
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-3">
                        <div className="text-stone-500 text-sm truncate">
                          {product.unitQty} {product.unitType}
                        </div>
                        <svg
                          className="w-5 h-5 text-stone-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchTerm.length > 1 ? (
                <div className="bg-white p-8 rounded-lg shadow-md text-center border-x-4 border-stone-400">
                  <h3 className="text-xl font-semibold mb-2">
                    No results found
                  </h3>
                  <p className="text-stone-600">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-8">
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

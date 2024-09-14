import {
  Form,
  useActionData,
  useNavigation,
  useLoaderData,
  useSubmit,
  useSearchParams,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { DatePicker } from "~/components/ui/datepicker";
import { priceEntries, products, UnitType } from "~/db/schema";
import { db } from "~/db/index";
import { eq, like } from "drizzle-orm";
import { debounce } from "~/lib/utils";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // Validate and process the data here
  if (formData.get("name")) {
    return { error: "Do not submit" };
  }
  // For example, you might want to save it to a database
  return redirect("/success"); // Redirect to a success page after submission
};

type LoaderData = {
  searchResults: (typeof products.$inferSelect)[];
  existingProduct: typeof products.$inferSelect | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("search") || "";
  const existingProductId = url.searchParams.get("existingProductId");

  let searchResults: (typeof products.$inferSelect)[] = [];
  let existingProduct = null;

  if (searchTerm.length > 2) {
    searchResults = await db
      .select()
      .from(products)
      .where(like(products.name, `%${searchTerm}%`))
      .limit(10);
  }

  if (existingProductId) {
    existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(existingProductId)))
      .limit(1);

    if (existingProduct.length > 0) {
      existingProduct = existingProduct[0];
    } else {
      existingProduct = null;
    }
  }

  return json<LoaderData>({ searchResults, existingProduct });
};

export default function NewPricePoint() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const { searchResults, existingProduct } = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<
    typeof products.$inferSelect | null
  >(existingProduct || null);

  useEffect(() => {
    if (existingProduct) {
      setSelectedProduct(existingProduct);
    }
  }, [existingProduct]);

  const debouncedSearch = debounce((term: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("search", term);
      return newParams;
    });
  }, 300);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 2) {
      debouncedSearch(term);
    }
  };
  return (
    <div className="container mx-auto p-4">
      <Form method="post" encType="multipart/form-data" className="space-y-4">
        {!selectedProduct && !isNewProduct && !existingProduct && (
          <div>
            <Label htmlFor="productSearch">Search for existing product</Label>
            <Input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for a product"
            />
            {searchResults.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-md p-4 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchTerm(product.name);
                    }}
                  >
                    <h3 className="font-bold">{product.name}</h3>
                    <p>Price: ${product.latestPrice?.toFixed(2)}</p>
                    <p>Category: {product.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}{" "}
        <div>
          <Button type="button" onClick={() => setIsNewProduct(!isNewProduct)}>
            {isNewProduct ? "Select Existing Product" : "Create New Product"}
          </Button>
        </div>
        {selectedProduct && !isNewProduct ? (
          <div>
            <h3>Selected Product: {selectedProduct.name}</h3>
            {/* Display other product details here */}
          </div>
        ) : isNewProduct ? (
          <>
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input type="text" id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="unitPricing">Unit Pricing</Label>
              <Input type="checkbox" id="unitPricing" name="unitPricing" />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                type="number"
                id="quantity"
                name="quantity"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input type="text" id="category" name="category" />
            </div>
            <div>
              <Label htmlFor="unitType">Unit Type</Label>
              <select id="unitType" name="unitType">
                {Object.values(UnitType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="productBrandName">Brand Name</Label>
              <Input
                type="text"
                id="productBrandName"
                name="productBrandName"
              />
            </div>
          </>
        ) : null}
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input
            type="number"
            id="price"
            name="price"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="datepickerPE">Date of Purchase</Label>
          <div id="datepickerPE">
            {" "}
            <DatePicker date={selectedDate} setDate={setSelectedDate} />
          </div>

          <input
            type="hidden"
            name="date"
            value={selectedDate?.toISOString()}
          />
        </div>
        <div>
          <Label htmlFor="proof">Proof (Images)</Label>
          <Input
            type="file"
            id="proof"
            name="proof"
            accept="image/*"
            multiple
            required
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
        </div>
        <Button type="submit" disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? "Submitting..." : "Submit"}
        </Button>
      </Form>
      {/* {actionData?.error && ( */}
      {/*   <p className="text-red-500 mt-4">{actionData.error}</p> */}
      {/* )} */}
    </div>
  );
}

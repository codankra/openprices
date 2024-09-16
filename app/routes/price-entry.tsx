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
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { priceEntries, products, UnitType, productBrands } from "~/db/schema";
import { db } from "~/db/index";
import { eq, like } from "drizzle-orm";
import { auth } from "~/services/auth.server";
import { z } from "zod";
import { AuthUser } from "~/services/user.server";

type LoaderData = {
  searchResults: (typeof products.$inferSelect)[];
  existingProduct: typeof products.$inferSelect | null;
  user: AuthUser;
  productBrandsList: (typeof productBrands.$inferSelect)[];
};

const formSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  price: z.number().positive("Price must be a positive number"),
  date: z
    .string()
    .refine((val: any) => !isNaN(Date.parse(val)), "Invalid date"),
  proof: z.string().url("Proof must be a valid URL").optional(),
  unitPricing: z.boolean().optional(),
  unitQty: z.number().positive().optional(),
  category: z.string().optional(),
  unitType: z.nativeEnum(UnitType).optional(),
  productBrandName: z.string().optional(),
  image: z.string().url("Image must be a valid URL").optional(),
  storeLocation: z.string().optional(),
});

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("search") || "";
  const existingProductId = url.searchParams.get("existingProductId");

  let searchResults: (typeof products.$inferSelect)[] = [];
  let existingProduct: typeof products.$inferSelect | null = null;

  if (searchTerm.length > 2) {
    searchResults = await db
      .select()
      .from(products)
      .where(like(products.name, `%${searchTerm}%`))
      .limit(10);
  }

  if (existingProductId) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(existingProductId)))
      .limit(1);

    existingProduct = result.length > 0 ? result[0] : null;
  }

  const productBrandsList = await db.select().from(productBrands);

  return json<LoaderData>({
    searchResults,
    existingProduct,
    user,
    productBrandsList,
  });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const rawFormData = Object.fromEntries(formData);

  try {
    const validatedData = formSchema.parse({
      ...rawFormData,
      price: parseFloat(rawFormData.price as string),
      unitPricing: rawFormData.unitPricing === "on",
      unitQty: rawFormData.unitQty
        ? parseFloat(rawFormData.unitQty as string)
        : undefined,
    });

    let productId = parseInt(validatedData.productId ?? "0");

    if (!productId) {
      // Insert new product
      const [newProduct] = await db
        .insert(products)
        .values({
          name: validatedData.name,
          latestPrice: validatedData.price,
          unitPricing: validatedData.unitPricing,
          unitQty: validatedData.unitQty,
          category: validatedData.category,
          unitType: validatedData.unitType,
          productBrandName: validatedData.productBrandName,
          image: validatedData.image,
        })
        .returning({ insertedId: products.id });

      productId = newProduct.insertedId;
    } else {
      // Update existing product's latest price
      await db
        .update(products)
        .set({ latestPrice: validatedData.price })
        .where(eq(products.id, productId));
    }

    // Insert new price entry
    await db.insert(priceEntries).values({
      contributorId: user.id,
      productId: productId,
      price: validatedData.price,
      date: validatedData.date,
      proof: validatedData.proof ?? null,
      storeLocation: validatedData.storeLocation ?? null,
    });

    return redirect("/success");
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.errors }, { status: 400 });
    }
    throw error;
  }
};

type ActionData = {
  errors?: z.ZodIssue[];
};

export default function NewPricePoint() {
  const { searchResults, existingProduct, user, productBrandsList } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const navigation = useNavigation();
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
      <h1 className="text-2xl font-bold mb-4">Add New Price Point</h1>
      <p className="mb-4">Logged in as: {user.name || user.email}</p>

      <Form
        method="post"
        encType="multipart/form-data"
        className="space-y-6 bg-stone-100 p-8 rounded-lg shadow-md max-w-3xl mx-auto"
      >
        {!selectedProduct && !isNewProduct && (
          <div className="bg-white p-6 rounded-md shadow-sm">
            <Label
              htmlFor="productSearch"
              className="text-stone-700 font-semibold"
            >
              Search for existing product
            </Label>
            <Input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for a product"
              className="mt-2 w-full max-w-md border-stone-300 focus:ring-stone-500 focus:border-stone-500"
            />
            <div className="flex items-center space-x-4 mt-4">
              <p className="text-stone-600">Or</p>{" "}
              <Button
                onClick={() => setIsNewProduct(true)}
                className="bg-stone-600 hover:bg-stone-700 text-white"
              >
                Create New Product
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white border border-stone-200 rounded-md p-4 cursor-pointer hover:bg-stone-50 transition duration-150 ease-in-out"
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchTerm(product.name);
                    }}
                  >
                    <h3 className="font-bold text-stone-800">{product.name}</h3>
                    <p className="text-stone-600">
                      Price: ${product.latestPrice?.toFixed(2)}
                    </p>
                    <p className="text-stone-500">
                      Category: {product.category}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <div className="bg-white border border-stone-200 rounded-md p-6 shadow-sm relative">
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsNewProduct(false);
                setSearchTerm("");
              }}
              className="absolute top-2 right-2 text-stone-500 hover:text-stone-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <input type="hidden" name="productId" value={selectedProduct.id} />
            <h3 className="font-bold text-stone-800 text-xl mb-2">
              {selectedProduct.name}
            </h3>
            {selectedProduct.image && (
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-32 h-32 object-cover mt-2 rounded-md shadow-sm"
              />
            )}
            <p className="text-stone-700 mt-2">
              Price: ${selectedProduct.latestPrice?.toFixed(2)}
            </p>
            <p className="text-stone-600">
              Category: {selectedProduct.category}
            </p>
            {selectedProduct.unitPricing && (
              <p className="text-stone-600">
                Unit: {selectedProduct.unitQty} {selectedProduct.unitType}
              </p>
            )}
            {selectedProduct.productBrandName && (
              <p className="text-stone-600">
                Brand: {selectedProduct.productBrandName}
              </p>
            )}
          </div>
        )}

        {isNewProduct && (
          <div className="bg-white p-6 rounded-md shadow-sm space-y-4">
            <div className="flex flex-col justify-center space-y-4 w-full md:w-1/2">
              <Button
                onClick={() => setIsNewProduct(false)}
                className="bg-stone-600 hover:bg-stone-700 text-white"
              >
                Search for Existing Product
              </Button>
              <p className="text-stone-600">Or</p>{" "}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-stone-700 font-semibold">
                  Product Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="unitPricing" name="unitPricing" />
                <Label
                  htmlFor="unitPricing"
                  className="text-stone-700 font-semibold"
                >
                  Unit Pricing
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="unitQty"
                  className="text-stone-700 font-semibold"
                >
                  Unit Quantity
                </Label>
                <Input
                  type="number"
                  id="unitQty"
                  name="unitQty"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="category"
                  className="text-stone-700 font-semibold"
                >
                  Category
                </Label>
                <Input
                  type="text"
                  id="category"
                  name="category"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="unitType"
                  className="text-stone-700 font-semibold"
                >
                  Unit Type
                </Label>
                <Select name="unitType">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UnitType).map((unitTypes) => (
                      <SelectItem key={unitTypes[1]} value={unitTypes[1]}>
                        {`${unitTypes[0][0]}${unitTypes[0]
                          .substring(1)
                          .toLowerCase()} (${unitTypes[1]})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="productBrandName"
                  className="text-stone-700 font-semibold"
                >
                  Brand Name
                </Label>
                <Select name="productBrandName">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {productBrandsList.map((brand) => (
                      <SelectItem key={brand.name} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="image" className="text-stone-700 font-semibold">
                  Product Image URL
                </Label>
                <Input
                  type="url"
                  id="image"
                  name="image"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="price" className="text-stone-700 font-semibold">
                  Price (USD)
                </Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="datepickerPE"
                  className="text-stone-700 font-semibold"
                >
                  Date of Purchase
                </Label>
                <div id="datepickerPE" className="mt-1">
                  <DatePicker date={selectedDate} setDate={setSelectedDate} />
                </div>
                <input
                  type="hidden"
                  name="date"
                  value={selectedDate?.toISOString()}
                />
              </div>
              <div>
                <Label htmlFor="proof" className="text-stone-700 font-semibold">
                  Proof (URL to image)
                </Label>
                <Input
                  type="url"
                  id="proof"
                  name="proof"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="storeLocation"
                  className="text-stone-700 font-semibold"
                >
                  Store Location
                </Label>
                <Input
                  type="text"
                  id="storeLocation"
                  name="storeLocation"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={navigation.state === "submitting"}
              className="w-full mt-6 bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              {navigation.state === "submitting" ? "Submitting..." : "Submit"}
            </Button>
          </div>
        )}
      </Form>

      {actionData?.errors && (
        <div className="mt-4 text-red-500">
          <ul>
            {actionData.errors.map((error) => (
              <li key={error.path.join(".")}>
                {error.path.join(".")}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

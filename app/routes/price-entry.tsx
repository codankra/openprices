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
import {
  priceEntries,
  products,
  UnitType,
  users,
  productBrands,
} from "~/db/schema";
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

      <Form method="post" encType="multipart/form-data" className="space-y-4">
        {!selectedProduct && !isNewProduct && (
          <div>
            <Label htmlFor="productSearch">Search for existing product</Label>
            <Input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for a product"
            />
            <div className="flex items-center space-x-4 mt-2">
              <p>Or</p>{" "}
              <Button onClick={() => setIsNewProduct(true)}>
                Create New Product
              </Button>
            </div>
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
        )}

        {selectedProduct && (
          <div className="border rounded-md p-4">
            <input type="hidden" name="productId" value={selectedProduct.id} />
            <h3 className="font-bold">{selectedProduct.name}</h3>
            {selectedProduct.image && (
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-24 h-24 object-cover mt-2"
              />
            )}
            <p>Price: ${selectedProduct.latestPrice?.toFixed(2)}</p>
            <p>Category: {selectedProduct.category}</p>
            {selectedProduct.unitPricing && (
              <p>
                Unit: {selectedProduct.unitQty} {selectedProduct.unitType}
              </p>
            )}
            {selectedProduct.productBrandName && (
              <p>Brand: {selectedProduct.productBrandName}</p>
            )}
          </div>
        )}

        {(selectedProduct || isNewProduct) && (
          <>
            {!selectedProduct && (
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
                  <Label htmlFor="unitQty">Unit Quantity</Label>
                  <Input
                    type="number"
                    id="unitQty"
                    name="unitQty"
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
                  <select id="productBrandName" name="productBrandName">
                    <option value="">Select a brand</option>
                    {productBrandsList.map((brand) => (
                      <option key={brand.name} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="image">Product Image URL</Label>
                  <Input type="url" id="image" name="image" />
                </div>
              </>
            )}
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
                <DatePicker date={selectedDate} setDate={setSelectedDate} />
              </div>
              <input
                type="hidden"
                name="date"
                value={selectedDate?.toISOString()}
              />
            </div>
            <div>
              <Label htmlFor="proof">Proof (URL to image)</Label>
              <Input type="url" id="proof" name="proof" />
            </div>
            <div>
              <Label htmlFor="storeLocation">Store Location</Label>
              <Input type="text" id="storeLocation" name="storeLocation" />
            </div>
            <Button type="submit" disabled={navigation.state === "submitting"}>
              {navigation.state === "submitting" ? "Submitting..." : "Submit"}
            </Button>
          </>
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

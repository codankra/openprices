import {
  Form,
  useActionData,
  useNavigation,
  useLoaderData,
  useSearchParams,
  Link,
  Await,
} from "@remix-run/react";
import { defer, json, redirect } from "@remix-run/node";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useState, useEffect, useCallback, Suspense } from "react";
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
import { products, UnitType } from "~/db/schema";
import { auth } from "~/services/auth.server";
import { z } from "zod";
import { AuthUser } from "~/services/user.server";
import {
  getAllProductBrands,
  getProductsBySearch,
  getProductById,
  addNewProduct,
  updateProductLatestPrice,
} from "~/services/product.server";
import { debounce } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { FaCircleInfo } from "react-icons/fa6";
import { uploadToR2 } from "~/services/r2.server";
import { addNewPriceEntry } from "~/services/price.server";
import HeaderLinks from "~/components/custom/HeaderLinks";

export const meta: MetaFunction = () => {
  return [
    { title: "New Price Entry" },
    {
      name: "description",
      content: "Contribute a new price history entry on Open Price Data",
    },
  ];
};

type LoaderData = {
  searchResults: (typeof products.$inferSelect)[];
  existingProduct: typeof products.$inferSelect | null;
  user: AuthUser;
  productBrandsListPromise: Awaited<ReturnType<typeof getAllProductBrands>>;
};

const formSchema = z
  .object({
    // PriceEntry Details
    price: z.number().positive("Price must be a positive number"),
    date: z
      .string()
      .refine((val: any) => !isNaN(Date.parse(val)), "Invalid date"),
    storeLocation: z.string().optional(),
    // Product Details
    productId: z.string().optional(),
    name: z.string().min(1, "Product name is required").optional(),
    unitQty: z.number().positive().optional(),
    unitPricing: z.boolean().optional(),
    unitType: z.nativeEnum(UnitType).optional(),
    category: z.string().optional(),
    productBrandName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.productId) {
        return true;
      }
      return (
        data.name !== undefined &&
        data.unitPricing !== undefined &&
        data.unitQty !== undefined &&
        data.category !== undefined &&
        data.unitType !== undefined &&
        data.productBrandName !== undefined
      );
    },
    {
      message:
        "Either an existing product must be selected, or all product details must be provided",
      path: ["productId"],
    }
  );

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }

  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("search") || "";
  let searchResults: (typeof products.$inferSelect)[] = [];
  if (searchTerm.length > 2) {
    searchResults = await getProductsBySearch(searchTerm);
  }

  const existingProductId = url.searchParams.get("existingProductId");
  let existingProduct: typeof products.$inferSelect | null = null;
  if (existingProductId) {
    existingProduct = await getProductById(existingProductId);
  }

  const productBrandsListPromise = getAllProductBrands();
  return defer({
    searchResults,
    existingProduct,
    user,
    productBrandsListPromise,
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
    // Validate form data first, without processing files
    const validatedData = formSchema.parse({
      ...rawFormData,
      price: parseFloat(rawFormData.price as string),
      unitPricing: rawFormData.unitPricing === "on",
      unitQty: rawFormData.unitQty
        ? parseFloat(rawFormData.unitQty as string)
        : undefined,
    });

    // Step 2: Handle file uploads
    const uploadFiles = async (files: File[], path: string) => {
      const urls = [];
      for (const file of files) {
        if (file.size > 3 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 3MB)`);
        }
        if (
          !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
            file.type
          )
        ) {
          throw new Error(`Invalid file type for ${file.name}`);
        }
        const buffer = await file.arrayBuffer();
        const url = await uploadToR2(
          `${path}/${Date.now()}-${file.name}`,
          Buffer.from(buffer)
        );
        urls.push(url);
      }
      return urls;
    };
    const productImageFile = formData.get("productImage") as File;
    const proofFiles = formData.getAll("proofFiles") as File[];

    const productImageUrl = productImageFile
      ? (await uploadFiles([productImageFile], "plu"))[0]
      : undefined;
    const proofUrls =
      proofFiles.length > 0 ? await uploadFiles(proofFiles, "proofs") : [];

    let productId = parseInt(validatedData.productId ?? "0");

    if (!productId) {
      const productDetails = {
        name: validatedData.name!,
        latestPrice: validatedData.price!,
        unitPricing: validatedData.unitPricing!,
        unitQty: validatedData.unitQty!,
        category: validatedData.category!,
        unitType: validatedData.unitType!,
        productBrandName: validatedData.productBrandName!,
        image: productImageUrl,
      };

      productId = await addNewProduct(productDetails);
    } else {
      // Update existing product's latest price
      await updateProductLatestPrice(productId, validatedData.price!);
    }
    const priceEntryDetails = {
      contributorId: user.id,
      productId: productId,
      price: validatedData.price,
      date: validatedData.date,
      proof: proofUrls.join(","),
      storeLocation: validatedData.storeLocation ?? null,
    }; // Insert new price entry
    await addNewPriceEntry(priceEntryDetails);

    return redirect(`/product/${productId}`);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.errors }, { status: 400 });
    }
    return json({ otherErrors: [error.message] }, { status: 400 });
  }
};

type ActionData = {
  errors?: z.ZodIssue[];
  otherErrors?: string[];
};

export default function NewPricePoint() {
  const {
    searchResults,
    existingProduct,
    productBrandsListPromise: productBrandsList,
  } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [_searchParams, setSearchParams] = useSearchParams();
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

  const clearSearch = () => {
    setSearchTerm("");
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete("search");
      newParams.delete("existingProductId");
      return newParams;
    });
  };

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("search", term);
        return newParams;
      });
    }, 300),
    [setSearchParams]
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 2) {
      debouncedSearch(term);
    }
  };

  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header className="">
        <HeaderLinks />
      </header>{" "}
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <Link to={"/"}>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </Link>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Contribute Prices</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className=" font-bold">
                By Manual Entry&nbsp;&nbsp;
              </BreadcrumbPage>
              <span> |</span>
              <Link to={"/upload-receipt"}>
                <BreadcrumbPage className="underline hover:bg-black/10 px-2 py-1 rounded transition-colors ml-0">
                  By Receipt Detection{" "}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Form
          method="post"
          encType="multipart/form-data"
          className="space-y-6 bg-stone-100 p-8 rounded-lg shadow-md "
        >
          <h1 className="text-2xl font-bold mb-4 text-center">
            New Price Entry
          </h1>

          {!selectedProduct && !isNewProduct && (
            <div className="bg-white p-6 rounded-md shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Product Details</h2>
              <Label
                htmlFor="productSearch"
                className="text-stone-700 font-semibold"
              >
                Search for Existing Product
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
                  type="button"
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
                      <h3 className="font-bold text-stone-800">
                        {product.name}
                      </h3>
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
              <h2 className="text-xl font-semibold mb-4">Product Details</h2>

              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setIsNewProduct(false);
                  clearSearch();
                }}
                type="button"
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
              <input
                type="hidden"
                name="productId"
                value={selectedProduct.id}
              />
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
              <h2 className="text-xl font-semibold mb-4">Product Details</h2>

              <div className="flex flex-col justify-center space-y-4 w-full md:w-1/2">
                <Button
                  type="button"
                  onClick={() => setIsNewProduct(false)}
                  className="bg-stone-600 hover:bg-stone-700 text-white"
                >
                  Search for Existing Product
                </Button>
                <p className="text-stone-600">Or</p>{" "}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="name"
                    className="text-stone-700 font-semibold"
                  >
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
                <div>
                  <Label
                    htmlFor="productBrandName"
                    className="text-stone-700 font-semibold"
                  >
                    Brand Name
                  </Label>
                  <div className="mt-1">
                    <Suspense
                      fallback={
                        <Input
                          type="text"
                          id="productBrandName"
                          name="productBrandName"
                          required
                          className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                        />
                      }
                    >
                      <Await
                        resolve={productBrandsList}
                        errorElement={
                          <Input
                            type="text"
                            id="productBrandName"
                            name="productBrandName"
                            required
                            className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                          />
                        }
                      >
                        {(resolvedProductBrandsList) => (
                          <Select name="productBrandName">
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a brand" />
                            </SelectTrigger>
                            <SelectContent>
                              {resolvedProductBrandsList.map((brand) => (
                                <SelectItem key={brand.name} value={brand.name}>
                                  {brand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Await>
                    </Suspense>
                  </div>
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
                    htmlFor="proofFiles"
                    className="text-stone-700 font-semibold"
                  >
                    Product Image
                  </Label>
                  <Input
                    type="file"
                    id="productImage"
                    name="productImage"
                    accept="image/*"
                    className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                  />{" "}
                </div>
                <div className="h-1"></div>
                <div className="h-1 hidden md:block"></div>
                <div>
                  <Label
                    htmlFor="unitType"
                    className="text-stone-700 font-semibold"
                  >
                    Unit Type
                  </Label>

                  <div className="mt-1">
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
                </div>
                <div>
                  <Label
                    htmlFor="unitQty"
                    className="text-stone-700 font-semibold"
                  >
                    Quantity of Unit
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
                <div className="flex self-center space-x-2 ">
                  <Checkbox id="unitPricing" name="unitPricing" />
                  <Label
                    htmlFor="unitPricing"
                    className="text-stone-700 font-semibold"
                  >
                    Is it Priced by Weight/Volume?{" "}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <FaCircleInfo />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Common with Produce, Meats/Cheeses, and Deli
                            Prepared Food{" "}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white p-6 rounded-md shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Price Entry</h2>
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
                  defaultValue={selectedProduct?.latestPrice ?? undefined}
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
                <div id="datepickerPE" className="mt-1 w-full">
                  <DatePicker date={selectedDate} setDate={setSelectedDate} />
                </div>
                <input
                  type="hidden"
                  name="date"
                  value={selectedDate?.toISOString()}
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
                  placeholder="Store Name and City/State"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>

              <div>
                <Label htmlFor="proof" className="text-stone-700 font-semibold">
                  <span>Proof (Upload Images) </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <FaCircleInfo />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Verify your price entry (Optional, but adds validity)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="file"
                  multiple
                  id="proofFiles"
                  name="proofFiles"
                  accept="image/*"
                  className="mt-1 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
              <Button
                type="submit"
                disabled={navigation.state === "submitting"}
                className="w-full mt-6 bg-ogfore hover:bg-ogfore-hover text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                {navigation.state === "submitting"
                  ? "Submitting..."
                  : "Save Price"}
              </Button>
            </div>
          </div>
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
        {actionData?.otherErrors && (
          <div className="mt-4 text-red-500">
            <h3 className="font-semibold">Other Errors:</h3>
            <ul>
              {actionData.otherErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

import {
  Form,
  useActionData,
  useNavigation,
  useLoaderData,
  useSearchParams,
  Link,
  Await,
} from "react-router";
import { data, redirect } from "react-router";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import React, { useState, useEffect, useCallback, Suspense } from "react";
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
import { requireAuth } from "~/services/auth.server";
import { z } from "zod";
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
import { PiBarcode } from "react-icons/pi";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  Plus,
  ChevronUp,
  Sparkles,
  Camera,
  CheckCircle2,
} from "lucide-react";
import BarcodeScanner from "~/components/custom/product/CaptureBarcode";

export const meta: MetaFunction = () => {
  return [
    { title: "New Price Entry" },
    {
      name: "description",
      content: "Contribute a new price history entry on Open Price Data",
    },
  ];
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
    upc: z.string().optional(),
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
        data.upc !== undefined &&
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireAuth(request, "/price-entry");
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("search") || "";
  let searchResults: (typeof products.$inferSelect)[] = [];
  if (searchTerm.length > 2) {
    searchResults = await getProductsBySearch(searchTerm);
  }

  const existingProductId = url.searchParams.get("existingProductId");
  let existingProduct: typeof products.$inferInsert | null = null;
  if (existingProductId) {
    existingProduct = await getProductById(existingProductId);
  }

  const productBrandsListPromise = getAllProductBrands();
  return {
    searchResults,
    existingProduct,
    user,
    productBrandsListPromise,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireAuth(request, "/price-entry");

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
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 5MB)`);
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
        upc: validatedData.upc!,
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
      return data({ errors: error.errors }, { status: 400 });
    }
    return data({ otherErrors: [error.message] }, { status: 400 });
  }
};

// Enum for our different form steps
enum ProcessingStep {
  INITIAL = "initial",
  BARCODE = "barcode",
  PRODUCT_CONFIRM = "product_confirm",
  PRODUCT_DETAILS = "product_details",
  PRICE_DETAILS = "price_details",
  CONTRIBUTOR_THANKS = "contributor_thanks",
}

export default function NewPricePoint() {
  const {
    searchResults,
    existingProduct,
    productBrandsListPromise: productBrandsList,
  } = useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>();
  const [_searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentStep, setCurrentStep] = useState<ProcessingStep>(
    ProcessingStep.INITIAL
  );
  const [selectedProduct, setSelectedProduct] = useState<
    typeof products.$inferInsert | null
  >(existingProduct || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formData, setFormData] = useState({
    upc: "",
    name: "",
    category: "",
    unitQty: 1,
    unitType: UnitType.COUNT,
    unitPricing: false,
    pricePerUnit: 0,
    storeLocation: "",
    productBrandName: "",
    productImage: undefined as File | undefined,
  });

  useEffect(() => {
    // Only set on initial load
    if (existingProduct) {
      setSelectedProduct(existingProduct);
      setCurrentStep(ProcessingStep.PRICE_DETAILS);
    }
  }, [existingProduct]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchTerm, setSearchParams]);

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

  const handleChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBarcodeDetected = async (upc: string) => {
    setIsScanning(true);
    handleChange("upc", upc);

    try {
      const response = await fetch(
        `/draftItem/upc/?upc=${encodeURIComponent(upc)}`
      );
      if (response.ok) {
        const data: { products?: (typeof products.$inferSelect)[] } =
          await response.json();
        if (data.products?.length === 1) {
          // Single product found
          setSelectedProduct(data.products[0]);
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        } else if (data.products && data.products.length > 1) {
          // Multiple products found (not handling in this simplified version)
          setSelectedProduct(data.products[0]);
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        } else {
          // No products found, go to product details entry
          setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
        }
      } else {
        console.log("Request for UPC returned status ", response.status);
        setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
      }
    } catch (error) {
      console.error("Failed to check product:", error);
      setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      handleChange("productImage", file);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/vision/parseProductImage", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process image");
      }

      const data = await response.json();

      if (data.productInfo) {
        // Auto-fill the form with the extracted information
        setFormData((prev) => ({
          ...prev,
          name: data.productInfo.productName || prev.name,
          category: data.productInfo.category || prev.category,
          unitQty: data.productInfo.unitQuantity || prev.unitQty,
          unitType: data.productInfo.unitType || prev.unitType,
          unitPricing: data.productInfo.isUnitPriced || prev.unitPricing,
          productBrandName:
            data.productInfo.productBrandName || prev.productBrandName,
        }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSearchTerm("");
    setCurrentStep(ProcessingStep.INITIAL);
    clearSearch();
  };

  const renderStepContent = () => {
    return (
      <div
        className={`
          ${
            isTransitioning
              ? "opacity-0"
              : "transition-opacity duration-300 opacity-100 ease-in"
          }`}
      >
        {(() => {
          switch (currentStep) {
            case ProcessingStep.INITIAL:
              return (
                <div className="space-y-6">
                  <h1 className="text-xl font-bold text-center">
                    Add a New Price
                  </h1>
                  <div className="flex flex-col space-y-4 items-center">
                    <Button
                      onClick={() => setCurrentStep(ProcessingStep.BARCODE)}
                      className="w-full sm:max-w-md flex justify-center items-center gap-2"
                    >
                      <PiBarcode className="w-5 h-5" />
                      Scan Product Barcode
                    </Button>
                    <p className="text-stone-600">OR</p>
                    <div className="w-full sm:max-w-md">
                      <Label
                        htmlFor="productSearch"
                        className="text-stone-700 font-semibold"
                      >
                        Search for Product
                      </Label>
                      <Input
                        type="text"
                        id="productSearch"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by name, brand, category..."
                        className="mt-2 w-full border-stone-300 focus:ring-stone-500 focus:border-stone-500"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white border border-stone-200 rounded-md p-3 cursor-pointer hover:bg-stone-50 transition-colors ease-in-out flex gap-3 items-center"
                            onClick={() => {
                              setSelectedProduct(product);
                              setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
                            }}
                          >
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-contain bg-stone-100 rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-stone-100 rounded flex items-center justify-center text-stone-400">
                                <span>No img</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-stone-800 truncate">
                                {product.name}
                              </h3>
                              <p className="text-sm text-stone-600 truncate">
                                ${product.latestPrice?.toFixed(2)} •{" "}
                                {product.category}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );

            case ProcessingStep.BARCODE:
              return (
                <div className="space-y-4">
                  <h1 className="text-xl font-bold text-center">
                    Scan Barcode
                  </h1>
                  <div className="mb-4">
                    <BarcodeScanner
                      onBarcodeDetected={handleBarcodeDetected}
                      shouldDisable={isScanning}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(ProcessingStep.INITIAL)}
                    disabled={isScanning}
                    className="w-full"
                  >
                    Back to Search
                  </Button>
                </div>
              );

            case ProcessingStep.PRODUCT_CONFIRM:
              if (!selectedProduct) return null;
              return (
                <div className="space-y-5">
                  <h1 className="text-xl font-bold text-center">
                    Confirm Product
                  </h1>
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <div className="flex gap-4 items-center">
                      {selectedProduct.image ? (
                        <img
                          src={selectedProduct.image}
                          alt={selectedProduct.name}
                          className="w-24 h-24 object-contain bg-stone-900 rounded"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-stone-200 rounded flex items-center justify-center text-stone-400">
                          No Image
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {selectedProduct.name}
                        </h3>
                        <p className="text-sm text-stone-600">
                          UPC: {selectedProduct.upc}
                        </p>
                        <p className="text-sm text-stone-600">
                          {selectedProduct.unitQty} {selectedProduct.unitType}
                        </p>
                        {selectedProduct.productBrandName && (
                          <p className="text-sm text-stone-600">
                            Brand: {selectedProduct.productBrandName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Wrong Product
                    </Button>
                    <Button
                      onClick={() => {
                        setCurrentStep(ProcessingStep.PRICE_DETAILS);
                        if (selectedProduct.latestPrice) {
                          setFormData((prev) => ({
                            ...prev,
                            pricePerUnit: selectedProduct.latestPrice || 0,
                          }));
                        }
                      }}
                      className="flex-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                  </div>
                </div>
              );

            case ProcessingStep.PRODUCT_DETAILS:
              return (
                <div className="space-y-5">
                  <h1 className="text-xl font-bold text-center">
                    New Product Details
                  </h1>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="productImage">
                        {isProcessingImage
                          ? "Scanning Image..."
                          : "Product Image"}
                      </Label>
                      <Sparkles
                        className={`w-4 h-4 transition-colors ${
                          isProcessingImage
                            ? "text-purple-600 animate-[pulse_1s_ease-in-out_infinite]"
                            : "text-stone-400"
                        }`}
                      />
                    </div>
                    <div className="relative">
                      <Input
                        id="productImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="cursor-pointer opacity-0 absolute inset-0 w-full h-full z-10"
                      />
                      <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center hover:border-stone-400 transition-colors">
                        {formData.productImage ? (
                          <img
                            src={URL.createObjectURL(formData.productImage)}
                            alt="Product preview"
                            className="max-h-24 mx-auto"
                          />
                        ) : (
                          <div className="text-stone-500">
                            <Camera className="w-6 h-6 mx-auto mb-2" />
                            <p className="text-sm">Click or drag image here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="upc">UPC/Barcode</Label>
                      <Input
                        id="upc"
                        value={formData.upc}
                        onChange={(e) => handleChange("upc", e.target.value)}
                        placeholder="Enter barcode number"
                        disabled={isProcessingImage}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        disabled={isProcessingImage}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productBrandName">Brand Name</Label>
                      <div className="mt-1">
                        <Suspense
                          fallback={
                            <Input
                              type="text"
                              id="productBrandName"
                              value={formData.productBrandName}
                              onChange={(e) =>
                                handleChange("productBrandName", e.target.value)
                              }
                              className="mt-1 w-full"
                            />
                          }
                        >
                          <Await
                            resolve={productBrandsList}
                            errorElement={
                              <Input
                                type="text"
                                id="productBrandName"
                                value={formData.productBrandName}
                                onChange={(e) =>
                                  handleChange(
                                    "productBrandName",
                                    e.target.value
                                  )
                                }
                                className="mt-1 w-full"
                              />
                            }
                          >
                            {(resolvedProductBrandsList) => (
                              <Select
                                name="productBrandName"
                                value={formData.productBrandName}
                                onValueChange={(value) =>
                                  handleChange("productBrandName", value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem key="NotListed-1" value="___">
                                    <b>**</b>Other Brand (Not Listed)<b>**</b>
                                  </SelectItem>
                                  {resolvedProductBrandsList.map((brand) => (
                                    <SelectItem
                                      key={brand.name}
                                      value={brand.name}
                                    >
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

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) =>
                          handleChange("category", e.target.value)
                        }
                        placeholder="What is the core item? (1-2 words)"
                        disabled={isProcessingImage}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitType">Unit Type</Label>
                      <Select
                        value={formData.unitType}
                        onValueChange={(value) =>
                          handleChange("unitType", value as UnitType)
                        }
                        disabled={isProcessingImage}
                      >
                        <SelectTrigger id="unitType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(UnitType).map(([key, value]) => (
                            <SelectItem key={value} value={value}>
                              {`${key[0]}${key
                                .substring(1)
                                .toLowerCase()} (${value})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitQty">Quantity of Unit</Label>
                      <Input
                        id="unitQty"
                        type="number"
                        value={formData.unitQty}
                        onChange={(e) =>
                          handleChange("unitQty", Number(e.target.value))
                        }
                        min="0"
                        step="0.01"
                        disabled={isProcessingImage}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unitPricing"
                      checked={formData.unitPricing}
                      onCheckedChange={(checked) =>
                        handleChange("unitPricing", checked === true)
                      }
                      disabled={isProcessingImage}
                    />
                    <Label htmlFor="unitPricing">Priced by Weight/Volume</Label>
                  </div>

                  <div className="pt-2 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(ProcessingStep.BARCODE)}
                      disabled={isProcessingImage}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentStep(ProcessingStep.PRICE_DETAILS)
                      }
                      disabled={isProcessingImage || !formData.name}
                    >
                      Continue to Price Entry
                    </Button>
                  </div>
                </div>
              );

            case ProcessingStep.PRICE_DETAILS:
              return (
                <Form
                  method="post"
                  encType="multipart/form-data"
                  className="space-y-5"
                >
                  <h1 className="text-xl font-bold text-center">
                    Price Details
                  </h1>

                  {selectedProduct ? (
                    <>
                      <input
                        type="hidden"
                        name="productId"
                        value={selectedProduct.id}
                      />
                      <div className="bg-stone-50 p-3 rounded-lg flex items-center gap-3">
                        {selectedProduct.image ? (
                          <img
                            src={selectedProduct.image}
                            alt={selectedProduct.name}
                            className="w-12 h-12 object-contain bg-stone-900 rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-stone-200 rounded flex items-center justify-center text-stone-400">
                            No Image
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {selectedProduct.name}
                          </h3>
                          <p className="text-sm text-stone-600 truncate">
                            {selectedProduct.category} •{" "}
                            {selectedProduct.unitQty} {selectedProduct.unitType}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={resetForm}
                          className="text-stone-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="name" value={formData.name} />
                      <input type="hidden" name="upc" value={formData.upc} />
                      <input
                        type="hidden"
                        name="unitQty"
                        value={formData.unitQty}
                      />
                      <input
                        type="hidden"
                        name="unitType"
                        value={formData.unitType}
                      />
                      <input
                        type="hidden"
                        name="unitPricing"
                        value={formData.unitPricing ? "on" : ""}
                      />
                      <input
                        type="hidden"
                        name="category"
                        value={formData.category}
                      />
                      <input
                        type="hidden"
                        name="productBrandName"
                        value={formData.productBrandName}
                      />

                      {formData.productImage && (
                        <div className="hidden">
                          <input
                            type="file"
                            id="productImage"
                            name="productImage"
                            className="hidden"
                          />
                        </div>
                      )}

                      <div className="bg-stone-50 p-3 rounded-lg flex items-center gap-3">
                        {formData.productImage ? (
                          <img
                            src={URL.createObjectURL(formData.productImage)}
                            alt="Product preview"
                            className="w-12 h-12 object-contain bg-stone-900 rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-stone-200 rounded flex items-center justify-center text-stone-400">
                            No Image
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {formData.name}
                          </h3>
                          <p className="text-sm text-stone-600 truncate">
                            {formData.category} • {formData.unitQty}{" "}
                            {formData.unitType}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() =>
                            setCurrentStep(ProcessingStep.PRODUCT_DETAILS)
                          }
                          className="text-stone-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="font-semibold">
                        Price (USD)
                      </Label>
                      <Input
                        type="number"
                        id="price"
                        name="price"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.pricePerUnit || ""}
                        onChange={(e) =>
                          handleChange("pricePerUnit", Number(e.target.value))
                        }
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="datepickerPE" className="font-semibold">
                        Date of Purchase
                      </Label>
                      <div id="datepickerPE" className="w-full">
                        <DatePicker
                          date={selectedDate}
                          setDate={setSelectedDate}
                        />
                      </div>
                      <input
                        type="hidden"
                        name="date"
                        value={selectedDate?.toISOString()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="storeLocation" className="font-semibold">
                        Store Location
                      </Label>
                      <Input
                        type="text"
                        id="storeLocation"
                        name="storeLocation"
                        placeholder="Store Name and City/State"
                        value={formData.storeLocation}
                        onChange={(e) =>
                          handleChange("storeLocation", e.target.value)
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="proof"
                        className="font-semibold flex items-center gap-1"
                      >
                        <span>Image Proof (Optional) </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <FaCircleInfo />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Verifying your price entry adds a verification
                                badge!
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
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (selectedProduct) {
                          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
                        } else {
                          setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
                        }
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        navigation.state === "submitting" ||
                        !formData.pricePerUnit
                      }
                      className="flex-1 bg-ogfore hover:bg-ogfore-hover"
                    >
                      {navigation.state === "submitting"
                        ? "Submitting..."
                        : "Save Price"}
                    </Button>
                  </div>
                </Form>
              );

            case ProcessingStep.CONTRIBUTOR_THANKS:
              return (
                <div className="bg-green-100 transition-opacity ease-out duration-1000 py-20 px-4 text-center rounded opacity-0 animate-[fadeIn_0.5s_ease-out_forwards,fadeOut_0.5s_ease-out_1s_forwards]">
                  <h2 className="text-xl font-semibold">
                    Thank you for Contributing!
                  </h2>
                </div>
              );
          }
        })()}
      </div>
    );
  };

  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header className="">
        <HeaderLinks />
      </header>
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
              <BreadcrumbPage className="font-bold">
                Entering Prices Manually&nbsp;&nbsp;
              </BreadcrumbPage>
              <span> |</span>
              <Link to={"/upload-receipt"}>
                <BreadcrumbPage className="underline decoration-dotted underline-offset-4 hover:bg-black/10 px-2 py-1 rounded transition-colors ml-0">
                  Use a Receipt{" "}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="mb-4 shadow-md">
          <CardContent className="p-6">{renderStepContent()}</CardContent>
        </Card>

        {actionData && "errors" in actionData && (
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

        {actionData && "otherErrors" in actionData && (
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


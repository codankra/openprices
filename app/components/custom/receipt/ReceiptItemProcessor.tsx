import { useState } from "react";
import { X, Plus, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { draftItems, UnitType, products } from "~/db/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { PiReceipt } from "react-icons/pi";
import BarcodeScanner from "../product/CaptureBarcode";

// Types for our component
type DraftItem = typeof draftItems.$inferSelect;
type Product = typeof products.$inferSelect;

interface CreateItemData {
  receiptText: string;
  name: string;
  category: string;
  unitQty: number;
  unitType: UnitType;
  pricePerUnit: number;
  unitPricing: boolean;
  upc: string;
  productImage?: File;
}
interface ReceiptItemProcessorProps {
  item: DraftItem;
  imageUrl: string;
  storeBrand: string;
  onSubmit: (formData: CreateItemData) => Promise<void>;
  onIgnore: () => Promise<void>;
  onBarcodeMatch: (productId: number, quantityPrice: number) => Promise<void>;
  onProductMismatch: (upc: string, description: string) => Promise<void>;
  onReceiptTextMatch: (
    productId: number,
    quantityPrice: number
  ) => Promise<void>;
}

// Enum for our different form steps
enum ProcessingStep {
  INITIAL = "initial",
  BARCODE = "barcode",
  PRODUCT_CONFIRM = "product_confirm",
  PRODUCT_DETAILS = "product_details",
  PRODUCT_UNITPRICE = "product_unitprice",
  CONTRIBUTOR_THANKS = "contributor_thanks",
  IGNORE_THANKS = "ignore_thanks",
}

const ReceiptItemProcessor = ({
  item,
  imageUrl,
  storeBrand,
  onSubmit,
  onIgnore,
  onBarcodeMatch,
  onProductMismatch,
  onReceiptTextMatch,
}: ReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(ProcessingStep.INITIAL);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [mismatchDescription, setMismatchDescription] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUPChecking, setIsUPChecking] = useState(false);
  const [matchedBy, setMatchedBy] = useState("");

  const [formData, setFormData] = useState<CreateItemData>({
    receiptText: item.receiptText,
    name: "",
    category: "",
    upc: "",
    unitQty: item.unitQuantity || 1,
    unitType: UnitType.COUNT,
    pricePerUnit: item.unitPrice || item.price,
    unitPricing: false,
  });
  const handleChange = <K extends keyof CreateItemData>(
    field: K,
    value: CreateItemData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          name: data.productInfo.productName,
          category: data.productInfo.category,
          unitQty: data.productInfo.unitQuantity,
          unitType: data.productInfo.unitType,
          unitPricing: data.productInfo.isUnitPriced,
        }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Handle error (you might want to add error state to your component)
    }
  };
  const checkProductReceiptIdentifier = async (receiptText: string) => {
    try {
      const response = await fetch(
        `/draftItem/pri?text=${encodeURIComponent(
          receiptText
        )}&brand=${encodeURIComponent(storeBrand)}`
      );
      if (response.ok) {
        const data: { product?: Product } = await response.json();
        if (data.product) {
          setMatchedProduct(data.product);
          setMatchedBy("PRI");
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        }
      }
    } catch (error) {
      console.error("Failed to check product receipt identifier:", error);
    }
  };

  const handleStartAdd = async () => {
    setIsTransitioning(true);

    // kick off the check but don't await it
    const checkPromise = checkProductReceiptIdentifier(formData.receiptText);
    setCurrentStep(ProcessingStep.BARCODE);
    try {
      await checkPromise;
    } catch (error) {
      console.error("Failed silent check of product receipt text:", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleBarcodeDetected = async (upc: string) => {
    setIsUPChecking(true);

    handleChange("upc", upc);

    try {
      const response = await fetch(
        `/draftItem/upc/?upc=${encodeURIComponent(upc)}`
      );
      if (response.ok) {
        const data: { product?: Product } = await response.json();
        if (data.product) {
          setMatchedProduct(data.product);
          setMatchedBy("UPC");
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        } else {
          setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
        }
      } else if (response.status == 404) {
        setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
      } else {
        console.log("Request for UPC returned status ", response.status);
        setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
      }
    } catch (error) {
      console.error("Failed to check product:", error);
      setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
    } finally {
      setIsUPChecking(false);
    }
  };

  const handleProductMismatch = async () => {
    setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
    setTimeout(() => {
      onProductMismatch(formData.upc, mismatchDescription);
    }, 1000);
  };

  const handleReceiptTextMatch = async (price: number) => {
    setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
    setTimeout(() => {
      onReceiptTextMatch(matchedProduct!.id, price);
    }, 300);
  };

  const handleBarcodeMatch = async (price: number) => {
    setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
    setTimeout(() => {
      onBarcodeMatch(matchedProduct!.id, price);
    }, 300);
  };
  const handleFinalizeProductMatch = async (
    includedQuantity?: number | undefined
  ) => {
    let price = formData.pricePerUnit;
    if (includedQuantity) {
      price = Number((price / includedQuantity).toFixed(2));
    }

    if (matchedBy === "PRI") {
      handleReceiptTextMatch(price);
    } else if (matchedBy === "UPC") {
      handleBarcodeMatch(price);
    } else {
      //default to simpler price entry - PRI
      handleReceiptTextMatch(price);
    }
  };

  const handleConfirmProductMatch = async () => {
    // if unitpriced, show weight/volume screen
    if (matchedProduct?.unitPricing) {
      setCurrentStep(ProcessingStep.PRODUCT_UNITPRICE);
    } else {
      handleFinalizeProductMatch();
    }
  };

  const renderStepContent = () => {
    return (
      <div
        className={`
              
        ${
          isTransitioning
            ? "opacity-0"
            : "transition-opacity duration-300 opacity-100 ease-in"
        }      `}
      >
        {(() => {
          switch (currentStep) {
            case ProcessingStep.INITIAL:
              return (
                <div>
                  {" "}
                  <h1 className="text-lg text-center font-semibold mb-4">
                    Double Check - Everything Right?{" "}
                  </h1>
                  <div className="flex gap-4 mb-11">
                    <div className="flex-grow space-y-2">
                      <Label
                        htmlFor="receiptText"
                        className="flex items-center gap-2 h-4"
                      >
                        Receipt Text
                        <PiReceipt className="w-4 h-4 text-stone-500" />
                      </Label>
                      <Input
                        id="receiptText"
                        value={formData.receiptText}
                        onChange={(e) =>
                          handleChange("receiptText", e.target.value)
                        }
                        className="bg-stone-50"
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label
                        htmlFor="pricePerUnit"
                        className="flex items-center gap-1 h-4"
                      >
                        Price
                        <span className="text-stone-500">$</span>
                      </Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        value={formData.pricePerUnit}
                        onChange={(e) =>
                          handleChange("pricePerUnit", Number(e.target.value))
                        }
                        className="bg-stone-50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {" "}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentStep(ProcessingStep.IGNORE_THANKS);
                        setTimeout(() => {
                          onIgnore();
                        }, 300);
                      }}
                      className="text-stone-500"
                      type="button"
                      disabled={isTransitioning}
                    >
                      <X className="w-5 h-4" />
                      Skip Product
                    </Button>
                    <Button onClick={handleStartAdd} disabled={isTransitioning}>
                      Add
                    </Button>
                  </div>
                </div>
              );

            case ProcessingStep.BARCODE:
              return (
                <div>
                  <div className="mb-4">
                    <BarcodeScanner
                      onBarcodeDetected={handleBarcodeDetected}
                      shouldDisable={isUPChecking}
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(ProcessingStep.INITIAL)}
                      disabled={isTransitioning || isUPChecking}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              );
            case ProcessingStep.PRODUCT_CONFIRM:
              return matchedProduct ? (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-lg flex justify-between">
                    <div>
                      <h3 className="font-semibold mb-2">Found Product:</h3>
                      <div className="flex gap-4">
                        {matchedProduct.image && (
                          <img
                            src={matchedProduct.image}
                            alt={matchedProduct.name}
                            className="w-20 h-[4.5rem] object-contain bg-stone-900 rounded"
                          />
                        )}
                        <div>
                          <p>{matchedProduct.name}</p>
                          <p className="text-sm text-stone-600">
                            UPC/EAN: {matchedProduct.upc}
                          </p>
                          <p className="text-sm text-stone-600">
                            Quantity Sold: {matchedProduct.unitQty}{" "}
                            {matchedProduct.unitType}
                          </p>
                        </div>
                      </div>
                    </div>{" "}
                    <Button
                      onClick={handleConfirmProductMatch}
                      className="self-end"
                    >
                      It's a Match!
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mismatchDescription">
                      Is this incorrect? Please describe how:
                    </Label>
                    <div className="flex justify-between gap-4">
                      <Input
                        id="mismatchDescription"
                        value={mismatchDescription}
                        onChange={(e: any) =>
                          setMismatchDescription(e.target.value)
                        }
                        placeholder="Wrong Product Name, Quanitity, Everything?"
                      />{" "}
                      <Button
                        variant="secondary"
                        onClick={handleProductMismatch}
                      >
                        Send Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null;

            case ProcessingStep.PRODUCT_DETAILS:
              return (
                <div className="space-y-4">
                  <div className=" text-center  mb-4">
                    <p className="text-lg font-semibold">
                      You Found a New Product 🎉
                    </p>
                    <p className="text-sm text-stone-600">
                      Barcode #: {formData.upc}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productImage">Product Image</Label>
                    <Input
                      id="productImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                      />
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
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitType">Unit Type</Label>
                      <Select
                        value={formData.unitType}
                        onValueChange={(value) =>
                          handleChange("unitType", value as UnitType)
                        }
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
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unitPricing"
                      checked={formData.unitPricing}
                      onCheckedChange={(checked) =>
                        handleChange("unitPricing", checked as boolean)
                      }
                    />
                    <Label htmlFor="unitPricing">Priced by Weight/Volume</Label>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(ProcessingStep.BARCODE)}
                    >
                      Back
                    </Button>
                    <div className="justify-end flex flex-col items-end space-y-1">
                      <Button
                        onClick={async () => {
                          setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
                          setTimeout(async () => {
                            await onSubmit(formData);
                          }, 1000);
                        }}
                      >
                        Save Product
                      </Button>
                    </div>
                  </div>
                </div>
              );
            case ProcessingStep.PRODUCT_UNITPRICE:
              return (
                <div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="unitTypeM">Unit Type</Label>
                      <Select value={matchedProduct!.unitType!} disabled>
                        <SelectTrigger id="unitTypeM" disabled>
                          <SelectValue />
                        </SelectTrigger>{" "}
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
                      <Label htmlFor="unitQty">Quantity Purchased:</Label>
                      <Input
                        id="unitQtyM"
                        type="number"
                        value={formData.unitQty}
                        onChange={(e) =>
                          handleChange("unitQty", Number(e.target.value))
                        }
                        min="0"
                        step="0.01"
                      />
                      <p>
                        Adj. Price: $
                        {Number(
                          formData.pricePerUnit / formData.unitQty
                        ).toFixed(2)}
                        /{formData.unitType}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentStep(ProcessingStep.PRODUCT_CONFIRM)
                      }
                    >
                      Back
                    </Button>
                    <div className="justify-end flex flex-col items-end space-y-1">
                      <Button
                        onClick={() =>
                          handleFinalizeProductMatch(formData.unitQty)
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              );

            case ProcessingStep.CONTRIBUTOR_THANKS:
              return (
                <div className="bg-green-100 transition-opacity ease-out duration-1000 py-20 px-4 text-center rounded opacity-0 animate-[fadeIn_0.5s_ease-out_forwards,fadeOut_0.5s_ease-out_1s_forwards]">
                  <h2 className="text-xl font-semibold">
                    Thank you for Contributing!
                  </h2>
                </div>
              );

            case ProcessingStep.IGNORE_THANKS:
              return (
                <div className="bg-stone-100 transition-opacity ease-out duration-1000 py-20 px-4 text-center rounded opacity-0 animate-[fadeIn_0.5s_ease-out_forwards,fadeOut_0.5s_ease-out_1s_forwards]">
                  <h2 className="text-xl font-semibold">✔️ Item Skipped</h2>
                </div>
              );
          }
        })()}
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <PiReceipt className="w-8 h-8 text-stone-400" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="font-medium truncate">{item.receiptText}</p>
            <p className="text-sm text-stone-500">
              ${item.price.toFixed(2)}
              {item.unitPrice &&
                ` ($${item.unitPrice.toFixed(2)} × ${item.unitQuantity})`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1"
              type="button"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Less
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && <div className="mt-4">{renderStepContent()}</div>}
      </CardContent>
    </Card>
  );
};

export default ReceiptItemProcessor;

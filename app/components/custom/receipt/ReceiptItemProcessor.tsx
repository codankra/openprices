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
  onBarcodeMatch: (productId: number) => Promise<void>;
  onProductMismatch: (upc: string, description: string) => Promise<void>;
}

// Enum for our different form steps
enum ProcessingStep {
  INITIAL = "initial",
  BARCODE = "barcode",
  PRODUCT_CONFIRM = "product_confirm",
  PRODUCT_DETAILS = "product_details",
  CONTRIBUTOR_THANKS = "contributor_thanks",
}

const ReceiptItemProcessor = ({
  item,
  imageUrl,
  storeBrand,
  onSubmit,
  onIgnore,
  onBarcodeMatch,
  onProductMismatch,
}: ReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(ProcessingStep.INITIAL);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [mismatchDescription, setMismatchDescription] = useState("");

  const [isCheckingRT, setIsCheckingRT] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [formData, setFormData] = useState<CreateItemData>({
    receiptText: item.receiptText,
    name: "",
    category: "",
    upc: "",
    unitQty: item.unitQuantity || 1,
    unitType: UnitType.PIECE,
    pricePerUnit: item.unitPrice || item.price,
    unitPricing: false,
  });
  const handleChange = <K extends keyof CreateItemData>(
    field: K,
    value: CreateItemData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleChange("productImage", file);
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
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        }
      }
    } catch (error) {
      console.error("Failed to check product receipt identifier:", error);
    }
  };

  const handleStartAdd = async () => {
    setIsTransitioning(true);

    setIsCheckingRT(true);
    console.log("Transition start");
    setTimeout(() => {
      setIsTransitioning(false);
      console.log("Transition end");
    }, 250);

    // kick off the check but don't await it
    const checkPromise = checkProductReceiptIdentifier(formData.receiptText);
    setCurrentStep(ProcessingStep.BARCODE);
    try {
      await checkPromise;
    } catch (error) {
      console.error("Failed silent product check:", error);
    } finally {
      setIsCheckingRT(false);
    }
  };

  const handleBarcodeDetected = async (upc: string) => {
    handleChange("upc", upc);

    try {
      const response = await fetch(
        `/draftItem/upc/?upc=${encodeURIComponent(upc)}`
      );
      if (response.ok) {
        const product = await response.json();
        if (product) {
          setMatchedProduct(product);
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        } else {
          setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
        }
      }
    } catch (error) {
      console.error("Failed to check product:", error);
      setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
    }
  };

  const handleProductMismatch = async () => {
    setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
    setTimeout(() => {
      onProductMismatch(formData.upc, mismatchDescription);
    });
  };
  const handleBarcodeMatch = async () => {
    setCurrentStep(ProcessingStep.CONTRIBUTOR_THANKS);
    setTimeout(() => {
      onBarcodeMatch(matchedProduct!.id);
    });
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
                      onClick={onIgnore}
                      className="text-stone-500"
                      type="button"
                      disabled={isCheckingRT}
                    >
                      <X className="w-5 h-4" />
                      Skip Product
                    </Button>
                    <Button onClick={handleStartAdd} disabled={isCheckingRT}>
                      Add
                    </Button>
                  </div>
                </div>
              );

            case ProcessingStep.BARCODE:
              return (
                <div>
                  <div className="mb-4">
                    <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(ProcessingStep.INITIAL)}
                      disabled={isCheckingRT}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              );
            case ProcessingStep.PRODUCT_CONFIRM:
              return matchedProduct ? (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Matched Product:</h3>
                    <p>{matchedProduct.name}</p>
                    <p className="text-sm text-stone-600">
                      UPC: {matchedProduct.upc}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Is this the correct product?</Label>
                    <div className="flex gap-4">
                      <Button onClick={handleBarcodeMatch}>
                        Yes, Confirm Match
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleProductMismatch}
                      >
                        Send Feedback
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mismatchDescription">
                      Incorrect? Please describe how:
                    </Label>
                    <Input
                      id="mismatchDescription"
                      value={mismatchDescription}
                      onChange={(e: any) =>
                        setMismatchDescription(e.target.value)
                      }
                      placeholder="Wrong Product Name, Quanitity, Everything?"
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="productImage">
                      Product Image (Optional)
                    </Label>
                    <Input
                      id="productImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
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
                      <Button onClick={() => onSubmit(formData)}>
                        Save Product
                      </Button>
                      <p className="text-sm text-stone-600 font-bold">
                        (Thank You!){" "}
                      </p>
                    </div>{" "}
                  </div>
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

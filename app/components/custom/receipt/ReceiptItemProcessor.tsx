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
  onSubmit: (formData: CreateItemData) => Promise<void>;
  onIgnore: () => Promise<void>;
  onBarcodeMatch?: (productId: number) => Promise<void>;
  onProductMismatch?: (upc: string, description: string) => Promise<void>;
}

// Enum for our different form steps
enum ProcessingStep {
  INITIAL = "initial",
  BARCODE = "barcode",
  PRODUCT_CONFIRM = "product_confirm",
  PRODUCT_DETAILS = "product_details",
}

const ReceiptItemProcessor = ({
  item,
  imageUrl,
  onSubmit,
  onIgnore,
  onBarcodeMatch,
  onProductMismatch,
}: ReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(ProcessingStep.INITIAL);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [mismatchDescription, setMismatchDescription] = useState("");
  const [originalReceiptText, _setOriginalReceiptText] = useState(
    item.receiptText
  );

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

    // Check for receipt text changes and lookup product
    if (field === "receiptText" && value !== originalReceiptText) {
      checkProductReceiptIdentifier(value as string);
    }
  };
  const checkProductReceiptIdentifier = async (receiptText: string) => {
    try {
      const response = await fetch(
        `/api/product-receipt-identifier?text=${encodeURIComponent(
          receiptText
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.product) {
          setMatchedProduct(data.product);
          setCurrentStep(ProcessingStep.PRODUCT_CONFIRM);
        }
      }
    } catch (error) {
      console.error("Failed to check product receipt identifier:", error);
    }
  };
  const handleBarcodeDetected = async (upc: string) => {
    handleChange("upc", upc);

    try {
      const response = await fetch(
        `/api/product?upc=${encodeURIComponent(upc)}`
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

  const handleProductConfirm = async (confirmed: boolean) => {
    if (confirmed && matchedProduct) {
      await onBarcodeMatch?.(matchedProduct.id);
      setIsExpanded(false);
    } else {
      if (mismatchDescription && onProductMismatch) {
        await onProductMismatch(formData.upc, mismatchDescription);
      }
      setCurrentStep(ProcessingStep.PRODUCT_DETAILS);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case ProcessingStep.INITIAL:
        return (
          <div className="">
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
                  onChange={(e) => handleChange("receiptText", e.target.value)}
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
              >
                <X className="w-5 h-4" />
                Skip Product
              </Button>
              <Button onClick={() => setCurrentStep(ProcessingStep.BARCODE)}>
                Add
              </Button>
            </div>
          </div>
        );

      case ProcessingStep.BARCODE:
        return (
          <div className="space-y-4">
            <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(ProcessingStep.INITIAL)}
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
                <Button onClick={() => handleProductConfirm(true)}>
                  Yes, Confirm Match
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(ProcessingStep.PRODUCT_DETAILS)}
                >
                  No, Enter Details Manually
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mismatchDescription">
                If incorrect, please describe why:
              </Label>
              <Input
                id="mismatchDescription"
                value={mismatchDescription}
                onChange={(e: any) => setMismatchDescription(e.target.value)}
                placeholder="Describe any discrepancies..."
              />
            </div>
          </div>
        ) : null;

      case ProcessingStep.PRODUCT_DETAILS:
        return (
          <div className="space-y-4">
            <h1 className="text-lg text-center font-semibold mb-4">
              You Found a New Product 🎉
            </h1>
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
                  onChange={(e) => handleChange("category", e.target.value)}
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
                <Button onClick={() => onSubmit(formData)}>Save Product</Button>
                <p className="text-sm text-stone-600 font-bold">
                  (Thank You!){" "}
                </p>
              </div>{" "}
            </div>
          </div>
        );
    }
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

import React, { useState } from "react";
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Upload,
} from "lucide-react";
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
import { draftItems, UnitType } from "~/db/schema";

type DraftItem = typeof draftItems.$inferSelect;

interface FormData {
  receiptText: string;
  name: string;
  category: string;
  unitQty: number;
  unitType: UnitType;
  productBrandName: string;
  pricePerUnit: number;
  quantity: number;
  productImage?: File;
}

interface ReceiptItemProcessorProps {
  item: DraftItem;
  imageUrl: string;
  storeLocation: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onIgnore: () => Promise<void>;
  onQuantityUpdate?: (quantity: number) => Promise<void>;
}

const ReceiptItemProcessor = ({
  item,
  imageUrl,
  storeLocation,
  onSubmit,
  onIgnore,
  onQuantityUpdate,
}: ReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    receiptText: item.receiptText,
    name: "",
    category: "",
    unitQty: item.unitQuantity || 1,
    unitType: UnitType.PIECE,
    productBrandName: "",
    pricePerUnit: item.unitPrice || item.price,
    quantity: item.unitQuantity || 1,
  });

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleChange("productImage", file);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
    setIsExpanded(false);
  };

  const renderStatusContent = () => {
    switch (item.status) {
      case "matched":
        return (
          <div className="flex items-center gap-4">
            <Label htmlFor="quantity">Update Quantity:</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => {
                const newQuantity = Number(e.target.value);
                handleChange("quantity", newQuantity);
                onQuantityUpdate?.(newQuantity);
              }}
              className="w-24"
            />
          </div>
        );

      case "completed":
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            <span>Processed</span>
          </div>
        );

      case "pending":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpand}
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
        );

      default:
        return null;
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Preview Row - Always Visible */}
        <div className="flex items-center gap-4">
          <div className="flex-grow min-w-0">
            <p className="font-medium truncate">{item.receiptText}</p>
            <p className="text-sm text-stone-500">
              ${item.price.toFixed(2)}
              {item.unitPrice &&
                ` ($${item.unitPrice.toFixed(2)} × ${item.unitQuantity})`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {item.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onIgnore}
                className="text-stone-500"
                type="button"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {renderStatusContent()}
          </div>
        </div>

        {/* Expanded Form */}
        {isExpanded && (
          <div className="mt-4 grid gap-4">
            {/* Receipt Image Preview */}
            <div className="relative h-24 w-full mx-auto sm:w-64 overflow-hidden bg-stone-100 rounded">
              <img
                src={imageUrl}
                alt="Receipt item"
                className="absolute"
                style={{
                  left: `${-item.minX + 10}px`,
                  top: `${-item.minY + 10}px`,
                  maxWidth: "none",
                }}
              />
            </div>

            {/* Original Receipt Text and Price */}
            <div className="flex gap-4">
              <div className="flex-grow space-y-2">
                <Label htmlFor="receiptText">Receipt Text</Label>
                <Input
                  id="receiptText"
                  value={formData.receiptText}
                  onChange={(e) => handleChange("receiptText", e.target.value)}
                  className="bg-stone-50"
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor="pricePerUnit">Price</Label>
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
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleChange("quantity", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitType">Unit</Label>
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
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productImage">Product Image (Optional)</Label>
              <Input
                id="productImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={toggleExpand}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save Product</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptItemProcessor;

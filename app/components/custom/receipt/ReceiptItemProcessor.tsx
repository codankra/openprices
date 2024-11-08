import React, { useState } from "react";
import { X, Plus, ChevronUp, CheckCircle2 } from "lucide-react";
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
import { Checkbox } from "~/components/ui/checkbox";

type DraftItem = typeof draftItems.$inferSelect;

interface CreateItemData {
  receiptText: string;
  name: string;
  category: string;
  unitQty: number;
  unitType: UnitType;
  pricePerUnit: number;
  unitPricing: boolean;
  productImage?: File;
}

interface ReceiptItemProcessorProps {
  item: DraftItem;
  imageUrl: string;
  onSubmit: (formData: CreateItemData) => Promise<void>;
  onIgnore: () => Promise<void>;
  onQuantityUpdate?: (quantity: number) => Promise<void>;
}

const ReceiptItemProcessor = ({
  item,
  imageUrl,
  onSubmit,
  onIgnore,
  onQuantityUpdate,
}: ReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<CreateItemData>({
    receiptText: item.receiptText,
    name: "",
    category: "",
    unitQty: item.unitQuantity || 1,
    unitType: UnitType.PIECE,
    pricePerUnit: item.unitPrice || item.price,
    unitPricing: false,
  });

  const toggleExpand = () => setIsExpanded(!isExpanded);

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

  const handleSubmit = () => {
    console.log("Submitting ,", formData);
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
              value={formData.unitQty}
              onChange={(e) => {
                const newQuantity = Number(e.target.value);
                handleChange("unitQty", newQuantity);
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
                  placeholder="What is the core item? (1-2 words)"
                />
              </div>{" "}
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

            {/* Packaging Details Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Packaging Details</h3>
                <p className="text-sm text-stone-600">
                  Most packages will have a label describing the amount of the
                  product being sold per package by its weight or volume.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex self-center space-x-2 ">
                <Checkbox
                  id="unitPricing"
                  checked={formData.unitPricing}
                  onCheckedChange={(checked) =>
                    handleChange("unitPricing", checked as boolean)
                  }
                />
                <div className="flex flex-col space-y-1">
                  {" "}
                  <Label
                    htmlFor="unitPricing"
                    className="text-stone-700 font-semibold"
                  >
                    Is it Priced by Weight/Volume?{" "}
                  </Label>
                  <p className="text-sm text-stone-600">
                    (Common with deli-prepared foods)
                  </p>
                </div>
              </div>
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

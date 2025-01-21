import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { FaWeightScale } from "react-icons/fa6";
import { draftItems, products, UnitType } from "~/db/schema";
import { useState, useEffect } from "react";

const MatchedItemsList = ({
  items,
  onQuantitySubmit,
  onIgnore,
}: {
  items: (typeof draftItems.$inferSelect & {
    product?: typeof products.$inferSelect;
  })[];
  onQuantitySubmit: (itemId: number, quantityPrice: number) => Promise<void>;
  onIgnore: (
    itemId: number,
    status: typeof draftItems.$inferSelect.status
  ) => Promise<void>;
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [unitTypes, setUnitTypes] = useState<Record<number, UnitType>>({});

  useEffect(() => {
    const newUnitTypes: Record<number, UnitType> = {};
    items.forEach((item) => {
      if (item.productId && item.product?.unitType) {
        newUnitTypes[item.id] = item.product.unitType as UnitType;
      }
    });
    setUnitTypes(newUnitTypes);
  }, [items]);

  const toggleItem = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      if (!prices[itemId]) {
        setPrices((prev) => ({
          ...prev,
          [itemId]: items.find((i) => i.id === itemId)?.price || 0,
        }));
      }
    }
    setExpandedItems(newExpanded);
  };

  const handleQuantityChange = (itemId: number, value: string) => {
    if (value === "") {
      setQuantities((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setQuantities((prev) => ({
        ...prev,
        [itemId]: value,
      }));
    }
  };

  const handlePriceChange = (itemId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setPrices((prev) => ({
        ...prev,
        [itemId]: numValue,
      }));
    }
  };

  const calculatePricePerUnit = (itemId: number) => {
    const quantity = parseFloat(quantities[itemId]) || 0;
    const totalPrice = prices[itemId] || 0;
    if (quantity <= 0) return 0;
    return totalPrice / quantity;
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <FaWeightScale className="w-5 h-5 text-ogfore" />
          <h2 className="text-xl font-semibold">Matched Items</h2>
        </div>
        <p className="text-sm text-stone-500">
          Just Enter How Much You Purchased
        </p>
      </div>

      {items.map((item) => (
        <Card key={item.id} className="border-ogfore-hover bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <FaWeightScale className="w-8 h-8 text-stone-400" />
              </div>
              <div className="flex-grow">
                <p className="font-medium">{item.receiptText}</p>
                <p className="text-sm text-stone-500">
                  Original Total: ${item.price.toFixed(2)}
                </p>
                {unitTypes[item.id] && (
                  <p className="text-sm text-stone-600">
                    Unit Type: {unitTypes[item.id]}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleItem(item.id)}
                className="gap-1"
              >
                {expandedItems.has(item.id) ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Enter Details
                  </>
                )}
              </Button>
            </div>

            {expandedItems.has(item.id) && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${item.id}`}>
                      Quantity Purchased ({unitTypes[item.id] || "units"})
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      value={quantities[item.id] || ""}
                      onChange={(e) =>
                        handleQuantityChange(item.id, e.target.value)
                      }
                      min="0"
                      step="0.01"
                      placeholder="Enter amount..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`price-${item.id}`}>Total Price</Label>
                    <Input
                      id={`price-${item.id}`}
                      type="number"
                      value={prices[item.id] || ""}
                      onChange={(e) =>
                        handlePriceChange(item.id, e.target.value)
                      }
                      min="0"
                      step="0.01"
                      placeholder="Enter price..."
                    />
                  </div>
                </div>

                {quantities[item.id] && prices[item.id] > 0 && (
                  <div className="bg-white p-3 rounded-md">
                    <p className="text-sm text-stone-600">
                      Price Per {unitTypes[item.id] || "Unit"}:
                    </p>
                    <p className="text-lg font-medium">
                      ${calculatePricePerUnit(item.id).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onIgnore(item.id, item.status)}
                    className="gap-1 text-stone-500"
                  >
                    <X className="w-4 h-4" />
                    Skip Product
                  </Button>
                  <Button
                    onClick={() =>
                      onQuantitySubmit(item.id, calculatePricePerUnit(item.id))
                    }
                    disabled={!quantities[item.id] || !prices[item.id]}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MatchedItemsList;

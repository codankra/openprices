import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { FaWeightScale } from "react-icons/fa6";
import { draftItems, products, UnitType } from "~/db/schema";
import { useState, Suspense } from "react";
import { Await } from "react-router";

const ItemCard = ({
  item,
  matchedProducts,
  isExpanded,
  onToggle,
  onQuantitySubmit,
  onIgnore,
}: {
  item: typeof draftItems.$inferSelect;
  matchedProducts: (typeof products.$inferInsert)[];
  isExpanded: boolean;
  onToggle: () => void;
  onQuantitySubmit: (itemId: number, quantityPrice: number) => Promise<void>;
  onIgnore: (
    itemId: number,
    status: typeof draftItems.$inferSelect.status
  ) => Promise<void>;
}) => {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(item.price);

  const product = matchedProducts.find((p) => p.id === item.productId);
  const unitType = product?.unitType as UnitType | undefined;

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setQuantity("");
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setQuantity(value);
    }
  };

  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setPrice(numValue);
    }
  };

  const calculatePricePerUnit = () => {
    const quantityNum = parseFloat(quantity) || 0;
    if (quantityNum <= 0) return 0;
    return price / quantityNum;
  };

  return (
    <Card className="border-ogfore-hover bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center w-8 h-8">
            {product?.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <FaWeightScale className="w-8 h-8 text-stone-400" />
            )}
          </div>
          <div className="flex-grow">
            <p className="font-medium">{product?.name || item.receiptText}</p>
            <p className="text-sm text-stone-500">
              Original Receipt Text: {item.receiptText}
            </p>
            <p className="text-sm text-stone-500">
              Original Total: ${item.price.toFixed(2)}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="gap-1"
          >
            {isExpanded ? (
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

        {isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`quantity-${item.id}`}>
                  Quantity Purchased ({unitType || "units"})
                </Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder={`Enter amount in ${unitType || "units"}...`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`price-${item.id}`}>Total Price</Label>
                <Input
                  id={`price-${item.id}`}
                  type="number"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Enter price..."
                />
              </div>
            </div>

            {quantity && price > 0 && (
              <div className="bg-white p-3 rounded-md">
                <p className="text-sm text-stone-600">
                  Price Per {unitType || "Unit"}:
                </p>
                <p className="text-lg font-medium">
                  ${calculatePricePerUnit().toFixed(2)}
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
                  onQuantitySubmit(item.id, calculatePricePerUnit())
                }
                disabled={!quantity || !price}
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MatchedItemsList = ({
  items,
  matchedDraftProductsPromise,
  onQuantitySubmit,
  onIgnore,
}: {
  items: (typeof draftItems.$inferSelect)[];
  matchedDraftProductsPromise: Promise<(typeof products.$inferInsert)[]>;
  onQuantitySubmit: (itemId: number, quantityPrice: number) => Promise<void>;
  onIgnore: (
    itemId: number,
    status: typeof draftItems.$inferSelect.status
  ) => Promise<void>;
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
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

      <Suspense fallback={<div>Loading matched products...</div>}>
        <Await resolve={matchedDraftProductsPromise} errorElement="-">
          {(matchedProducts) => (
            <>
              <div className="space-y-4">
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    matchedProducts={matchedProducts}
                    isExpanded={expandedItems.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    onQuantitySubmit={onQuantitySubmit}
                    onIgnore={onIgnore}
                  />
                ))}
              </div>
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
};

export default MatchedItemsList;

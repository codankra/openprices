import { useState } from "react";
import { Plus, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { draftItems } from "~/db/schema";
import { FaWeightScale } from "react-icons/fa6";
import { Input } from "~/components/ui/input";
type DraftItem = typeof draftItems.$inferSelect;

interface MatchedReceiptItemProcessorProps {
  item: DraftItem;
  imageUrl: string;
  onProductMatch: (unitQty: number) => Promise<void>;
}
const MatchedReceiptItemProcessor = ({
  item,
  imageUrl,
  onProductMatch,
}: MatchedReceiptItemProcessorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quantity, setQuantity] = useState(item.unitQuantity || 1);

  const handleSubmit = async () => {
    // TODO: Implement API call to create price entry and mark draft item complete
    // createPriceEntry({ ...draftItem, quantity });
    // markDraftItemComplete(draftItem.id);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <FaWeightScale className="w-8 h-8 text-stone-400" />
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

        {isExpanded && (
          <div className="mt-4">
            {" "}
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
                min="0"
                step="0.01"
              />
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchedReceiptItemProcessor;

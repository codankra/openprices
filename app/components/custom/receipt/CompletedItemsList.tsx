import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PiReceipt } from "react-icons/pi";
import { draftItems } from "~/db/schema";

interface CompletedItemsListProps {
  items: (typeof draftItems.$inferSelect)[];
}

export const CompletedItemsList = ({ items }: CompletedItemsListProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Completed Items</h2>
          <p className="text-sm text-stone-500">Successfully processed items</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <PiReceipt className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate">{item.receiptText}</p>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <span>${item.price.toFixed(2)}</span>
                      {item.unitPrice && (
                        <span className="text-stone-400">
                          (${item.unitPrice.toFixed(2)} × {item.unitQuantity})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ban } from "lucide-react";
import { draftItems } from "~/db/schema";

interface IgnoredItemsListProps {
  items: (typeof draftItems.$inferSelect)[];
}

export const IgnoredItemsList = ({ items }: IgnoredItemsListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ignored Items</h2>
          <p className="text-sm text-stone-500">
            Skipped items from processing
          </p>
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
        <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="bg-stone-50/50 opacity-60">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Ban className="w-5 h-5 text-stone-400" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate text-sm">
                      {item.receiptText}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-stone-600">
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

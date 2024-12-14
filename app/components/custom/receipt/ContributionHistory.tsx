import { Card, CardContent } from "@/components/ui/card";
import {
  Receipt,
  Tag,
  Calendar,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Image,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { receipts, priceEntries } from "~/db/schema";
import { Link, useNavigate } from "react-router";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const EmptyState = ({ type }: { type: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
      {type === "receipts" ? (
        <Receipt className="w-6 h-6 text-stone-400" />
      ) : (
        <Tag className="w-6 h-6 text-stone-400" />
      )}
    </div>
    <h3 className="text-lg font-semibold text-stone-700">No {type} yet</h3>
    <p className="text-sm text-stone-500 max-w-sm mt-2">
      {type === "receipts"
        ? "Start by uploading your first receipt to contribute to price tracking"
        : "Begin adding price entries to help track price changes over time"}
    </p>
  </div>
);

export const ReceiptItem = ({
  receipt,
}: {
  receipt: typeof receipts.$inferInsert;
}) => (
  <Link to={`/receipt/${receipt.id}`}>
    <Card className="mb-4 hover:shadow-md hover:bg-stone-100 transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h4 className="font-semibold text-lg text-stone-800">
              {receipt.storeBrandName}
            </h4>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(receipt.purchaseDate), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{receipt.storeLocation}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-lg font-semibold text-stone-800">
              {formatCurrency(receipt.totalAmount!)}
            </div>
            <Badge
              variant={receipt.status === "processed" ? "default" : "secondary"}
            >
              {receipt.status === "processed" ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              {receipt.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);
export const PriceEntryItem = ({
  entry,
}: {
  entry: typeof priceEntries.$inferInsert;
}) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a proof link
    if ((e.target as HTMLElement).closest("a")) {
      return;
    }
    navigate(`/product/${entry.productId}`);
  };

  return (
    <Card
      className="mb-4 hover:shadow-md hover:bg-stone-50 transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg text-stone-800">
                Product #{entry.productId}
              </h4>
              <Badge
                variant={entry.verified ? "default" : "secondary"}
                className="text-xs"
              >
                {entry.entrySource}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(entry.date), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <MapPin className="w-4 h-4" />
              <span>{entry.storeLocation}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-stone-600" />
            <span className="text-lg font-semibold text-stone-800">
              {formatCurrency(entry.price)}
            </span>
          </div>
        </div>
        {entry.proof && (
          <div className="mt-4 text-sm text-stone-500">
            <div className="flex gap-2">
              {entry.proof.split(",").map((proofUrl, index) => (
                <a
                  key={index}
                  href={proofUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                >
                  <span>
                    {entry.entrySource === "receipt"
                      ? "Receipt"
                      : `Proof ${index + 1}`}
                  </span>
                  <Image className="w-3 h-3 ml-1" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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

export const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
      <div className="relative">
        <Receipt className="w-6 h-6 text-stone-400" />
        <Tag className="w-4 h-4 text-stone-400 absolute -bottom-1 -right-1" />
      </div>
    </div>
    <h3 className="text-lg font-semibold text-stone-700">
      No Recent Contributions Found
    </h3>
    <p className="text-sm text-stone-500 max-w-sm mt-2">
      Start contributing by uploading receipts or adding individual price
      entries. Those contributions will appear here.
    </p>
  </div>
);

export const ReceiptItem = ({
  receipt,
}: {
  receipt: typeof receipts.$inferInsert;
}) => (
  <Link to={`/receipt/${receipt.id}`}>
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon Column */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm text-stone-500">Bought from</span>
              <span className="font-medium text-stone-800">
                {receipt.storeBrandName}
              </span>
              <Badge
                variant={
                  receipt.status === "processed" ? "default" : "secondary"
                }
                className="ml-auto text-xs"
              >
                {receipt.status === "processed" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {receipt.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center text-stone-600">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">{receipt.storeLocation}</span>
              </div>
              <div className="flex items-center text-stone-600">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{format(new Date(receipt.purchaseDate), "MMM d")}</span>
              </div>
              <div className="ml-auto font-medium text-stone-800">
                {formatCurrency(receipt.totalAmount!)}
              </div>
            </div>
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
    if ((e.target as HTMLElement).closest("a")) return;
    navigate(`/product/${entry.productId}`);
  };

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon Column */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm text-stone-500">Spotted price for</span>
              <span className="font-medium text-stone-800">
                Product #{entry.productId}
              </span>
              <Badge
                variant={entry.verified ? "default" : "secondary"}
                className="ml-auto text-xs"
              >
                {entry.entrySource}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center text-stone-600">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">{entry.storeLocation}</span>
              </div>
              <div className="flex items-center text-stone-600">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{format(new Date(entry.date), "MMM d")}</span>
              </div>
              <div className="ml-auto font-medium text-stone-800">
                {formatCurrency(entry.price)}
              </div>
            </div>
            {entry.proof && (
              <div className="flex gap-2 mt-2">
                {entry.proof.split(",").map((proofUrl, index) => (
                  <a
                    key={index}
                    href={proofUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    <Image className="w-3 h-3 mr-1" />
                    <span>
                      {entry.entrySource === "receipt"
                        ? "Receipt"
                        : `Proof ${index + 1}`}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

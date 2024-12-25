import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { products } from "~/db/schema";

type ProductType = typeof products.$inferSelect;
const ProductSelectionCarousel = ({
  products,
  onProductSelect,
  onMismatchReport,
  onAddNew,
}: {
  products: ProductType[];
  onProductSelect: (product: ProductType) => void;
  onMismatchReport: (productId: number, description: string) => void;
  onAddNew: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mismatchDescription, setMismatchDescription] = useState("");
  const [showMismatchForm, setShowMismatchForm] = useState(false);

  // If there's only one product, treat it like the original flow
  if (products.length === 1) {
    return (
      <div className="space-y-4">
        <div className="bg-stone-50 p-4 rounded-lg flex justify-between">
          <div>
            <h3 className="font-semibold mb-2">Found Product:</h3>
            <div className="flex gap-4">
              {products[0].image && (
                <img
                  src={products[0].image}
                  alt={products[0].name}
                  className="w-20 h-[4.5rem] object-contain bg-stone-900 rounded"
                />
              )}
              <div>
                <p>{products[0].name}</p>
                <p className="text-sm text-stone-600">
                  UPC/EAN: {products[0].upc}
                </p>
                <p className="text-sm text-stone-600">
                  Quantity: {products[0].unitQty} {products[0].unitType}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => onProductSelect(products[0])}
            className="self-end"
          >
            It's a Match!
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mismatchDescription">
            Is this incorrect? Please describe how:
          </Label>
          <div className="flex justify-between gap-4">
            <Input
              id="mismatchDescription"
              value={mismatchDescription}
              onChange={(e) => setMismatchDescription(e.target.value)}
              placeholder="Wrong Product Name, Quantity, Everything?"
            />
            <Button
              variant="secondary"
              onClick={() =>
                onMismatchReport(products[0].id, mismatchDescription)
              }
            >
              Send Feedback
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Multiple products UI remains the same as before
  const nextProduct = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const previousProduct = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const currentProduct = products[currentIndex];

  return (
    <div className="space-y-4">
      <div className="relative bg-stone-50 p-4 rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
          onClick={previousProduct}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
          onClick={nextProduct}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="px-8">
          <h3 className="font-semibold mb-2">
            Multiple matches found - Product {currentIndex + 1} of{" "}
            {products.length}:
          </h3>
          <div className="flex gap-4">
            {currentProduct.image && (
              <img
                src={currentProduct.image}
                alt={currentProduct.name}
                className="w-20 h-[4.5rem] object-contain bg-stone-900 rounded"
              />
            )}
            <div>
              <p>{currentProduct.name}</p>
              <p className="text-sm text-stone-600">
                UPC/EAN: {currentProduct.upc}
              </p>
              <p className="text-sm text-stone-600">
                Quantity: {currentProduct.unitQty} {currentProduct.unitType}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => onProductSelect(currentProduct)}>
              Select This Product
            </Button>
          </div>
        </div>
      </div>

      {!showMismatchForm ? (
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setShowMismatchForm(true)}
            className="text-stone-600"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Report Wrong Product Info
          </Button>
          <Button variant="secondary" onClick={onAddNew}>
            Add New Product
          </Button>
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <Label htmlFor="mismatchDescription">
                Please describe what's incorrect:
              </Label>
              <div className="flex gap-4">
                <Input
                  id="mismatchDescription"
                  value={mismatchDescription}
                  onChange={(e) => setMismatchDescription(e.target.value)}
                  placeholder="Wrong Product Name, Quantity, Everything?"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    onMismatchReport(currentProduct.id, mismatchDescription);
                    setShowMismatchForm(false);
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProductSelectionCarousel;

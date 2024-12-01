import React, { useState, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onBarcodeDetected: (code: string) => void;
  initialUPC?: string;
  shouldDisable?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeDetected,
  shouldDisable,
  initialUPC,
}) => {
  const [error, setError] = useState<string>("");
  const [showInput, setShowInput] = useState(false);
  const [manualInput, setManualInput] = useState<string>(initialUPC ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = shouldDisable ?? false;

  const createHints = () => {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return hints;
  };

  const processImage = async (file: File) => {
    try {
      setError("");

      const imageUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader(createHints());
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result) {
        onBarcodeDetected(result.getText());
      }
    } catch (err) {
      setError("Unable to detect barcode. Please try again or enter manually.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleManualInput = () => {
    const codeRegex = /^\d{4,13}$/;
    if (codeRegex.test(manualInput)) {
      onBarcodeDetected(manualInput);
      setManualInput("");
      setError("");
    } else {
      setError("Invalid barcode format");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="space-y-4">
        <h1 className="text-lg text-center font-semibold">
          Find the Item's UPC/PLU# Barcode
        </h1>
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
          >
            <Camera className="mr-2 h-4 w-4" />
            Take a Barcode Picture
          </Button>
          {!showInput && (
            <Button variant="secondary" onClick={() => setShowInput(true)}>
              Or Enter Manually{" "}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {showInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode number"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1"
              disabled={isDisabled}
            />
            <Button
              onClick={handleManualInput}
              variant="secondary"
              disabled={isDisabled}
            >
              Enter
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;

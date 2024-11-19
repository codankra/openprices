import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BarcodeScanner: React.FC = () => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [manualInput, setManualInput] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Setup hints for supported barcode formats
  const createHints = useCallback(() => {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
    ]);
    return hints;
  }, []);

  const initializeCodeReader = useCallback(() => {
    // Create a new code reader with our hints
    const codeReader = new BrowserMultiFormatReader(createHints());
    codeReaderRef.current = codeReader;

    return codeReader;
  }, [createHints]);

  const startScanning = useCallback(async () => {
    console.log("🎥 Starting scanning process...");
    try {
      console.log("Resetting previous states...");
      setError("");
      setResult(null);
      setScanning(true);
      console.log("Initializing code reader...");
      const codeReader = initializeCodeReader();

      console.log("Checking video reference...");
      if (!videoRef.current) {
        console.error("❌ Video element not found");
        throw new Error("Video element not found");
      }

      console.log("Starting video device decode...");
      await codeReader.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result) => {
          if (result) {
            console.log("✅ Barcode detected:", result.getText());
            setResult(result.getText());
            stopScanning();
          }
        }
      );
    } catch (err) {
      console.error("❌ Scanning error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      stopScanning();
    }
  }, [initializeCodeReader]);

  const stopScanning = useCallback(() => {
    console.log("🛑 Stopping scanner...");
    codeReaderRef.current = null;
    setScanning(false);
    console.log("Scanner stopped, resources cleared");
  }, []);

  const handleManualInput = () => {
    console.log("📝 Processing manual input:", manualInput);
    // Validate UPC, EAN, or PLU code
    const codeRegex = /^\d{4,13}$/;

    if (codeRegex.test(manualInput)) {
      console.log("✅ Valid manual input detected");
      setResult(manualInput);
      setManualInput("");
      setError("");
    } else {
      console.warn("❌ Invalid manual input format");
      setError("Invalid barcode or PLU code format");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {scanning ? (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg border border-gray-200"
              autoPlay
              playsInline
              muted
            />
            <Button
              onClick={stopScanning}
              variant="secondary"
              className="mt-2 w-full"
            >
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button onClick={startScanning} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>

            <div className="flex">
              <Input
                placeholder="Enter barcode or PLU"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 mr-2"
              />
              <Button onClick={handleManualInput} variant="secondary">
                Enter
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Scanned Code:</h3>
            <p className="font-mono">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;

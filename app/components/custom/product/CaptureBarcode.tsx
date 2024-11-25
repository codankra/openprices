import React, { useState, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BarcodeScanner: React.FC = () => {
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setResult(null);

      // Create URL for the selected image
      const imageUrl = URL.createObjectURL(file);

      // Initialize reader with hints
      const reader = new BrowserMultiFormatReader(createHints());

      // Attempt to decode
      const result = await reader.decodeFromImageUrl(imageUrl);

      // Clean up URL
      URL.revokeObjectURL(imageUrl);

      if (result) {
        setResult(result.getText());
      }
    } catch (err) {
      console.error("Decoding error:", err);
      setError("Unable to detect barcode. Please try again or enter manually.");
    }
  };

  const handleImageCapture = async () => {
    try {
      // Check if device has camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      // Create video element to capture frame
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      // Create canvas to capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Canvas context not available");

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Stop video stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, "image/jpeg");
      });

      // Process the image
      await processImage(
        new File([blob], "capture.jpg", { type: "image/jpeg" })
      );
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access failed. Please try uploading an image instead.");
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
      setResult(manualInput);
      setManualInput("");
      setError("");
    } else {
      setError("Invalid barcode format");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Button onClick={handleImageCapture}>
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Image
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Enter barcode manually"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleManualInput} variant="secondary">
            Enter
          </Button>
        </div>

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

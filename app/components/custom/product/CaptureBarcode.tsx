import React, { useState, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BarcodeScanner: React.FC = () => {
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      const imageUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader(createHints());
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result) {
        setResult(result.getText());
      }
    } catch (err) {
      console.error("Decoding error:", err);
      setError("Unable to detect barcode. Please try again or enter manually.");
    }
  };

  const startPreview = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
      setIsPreviewActive(true);
      setError("");
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access failed. Please try uploading an image instead.");
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewActive(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !stream) return;

    // Create canvas to capture frame
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Canvas context not available");

    // Draw video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/jpeg");
    });

    // Stop the preview
    stopPreview();

    // Process the image
    await processImage(new File([blob], "capture.jpg", { type: "image/jpeg" }));
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
        {isPreviewActive ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg border border-gray-200"
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={captureImage} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button onClick={stopPreview} variant="secondary">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button onClick={startPreview}>
              <Camera className="mr-2 h-4 w-4" />
              Open Camera
            </Button>

            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

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

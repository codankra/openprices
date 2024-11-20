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
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

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

  const cleanupScanner = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current = null;
    }

    // Clean up media stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const initializeCodeReader = useCallback(() => {
    cleanupScanner();
    const codeReader = new BrowserMultiFormatReader(createHints());
    codeReaderRef.current = codeReader;
    return codeReader;
  }, [cleanupScanner, createHints]);

  const requestCameraAccess = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" }, // Prefer back camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });
      }

      return mediaStream;
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotFoundError":
            throw new Error("No camera found on this device");
          case "NotAllowedError":
            throw new Error("Camera permission denied");
          case "NotReadableError":
            throw new Error("Camera already in use");
          default:
            throw new Error(`Camera error: ${err.message}`);
        }
      }
      throw err;
    }
  };

  const startScanning = useCallback(async () => {
    console.log("🎥 Starting scanning process...");
    try {
      setError("");
      setResult(null);
      setScanning(true);

      console.log("Requesting camera access...");
      await requestCameraAccess();

      console.log("Initializing code reader...");
      const codeReader = initializeCodeReader();

      if (!videoRef.current) {
        throw new Error("Video element initialization failed");
      }

      console.log("Starting video device decode...");
      const controls = codeReader.decodeFromVideoDevice(
        undefined, // Use default device
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            console.log("✅ Barcode detected:", text);
            setResult(text);
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
    cleanupScanner();
    setScanning(false);
    console.log("Scanner stopped, resources cleared");
  }, [cleanupScanner]);

  const handleManualInput = () => {
    console.log("📝 Processing manual input:", manualInput);
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

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

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

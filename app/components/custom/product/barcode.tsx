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
      BarcodeFormat.QR_CODE, // Add QR support
      BarcodeFormat.DATA_MATRIX, // Add Data Matrix support
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF, // Add ITF support
      BarcodeFormat.CODABAR,
    ]);
    // Add additional hints to improve detection
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    hints.set(DecodeHintType.ASSUME_GS1, true);
    hints.set(DecodeHintType.PURE_BARCODE, false);
    hints.set(DecodeHintType.RETURN_CODABAR_START_END, true);
    return hints;
  }, []);

  const cleanupScanner = useCallback(() => {
    if (codeReaderRef.current) {
      try {
        // Stop any ongoing scanning
        codeReaderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
      codeReaderRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping track:", e);
        }
      });
      setStream(null);
    }

    // Ensure video element is cleaned up
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
      // Basic constraints that work across browsers
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777777778 },
          frameRate: { ideal: 30 },
        },
      };

      console.log("Requesting camera access with constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      console.log("Camera access granted");

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;

          const handleVideoReady = () => {
            console.log("Video element ready");
            resolve();
          };

          videoRef.current.onloadedmetadata = handleVideoReady;
          videoRef.current.onloadeddata = handleVideoReady;

          // If video is already loaded, resolve immediately
          if (videoRef.current.readyState >= 2) {
            console.log("Video already loaded");
            resolve();
          }
        });

        // Start playing the video
        try {
          await videoRef.current.play();
          console.log("Video playback started");
        } catch (e) {
          console.error("Error playing video:", e);
          throw new Error("Failed to start video playback");
        }
      }

      setStream(mediaStream);
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
  const stopScanning = useCallback(() => {
    console.log("Stopping scanner...");
    cleanupScanner();
    setScanning(false);
  }, [cleanupScanner]);

  const startScanning = useCallback(async () => {
    try {
      setError("");
      setResult(null);
      setScanning(true);

      await requestCameraAccess();
      console.log("Camera access successful");

      const codeReader = initializeCodeReader();
      console.log("Code reader initialized");
      if (!videoRef.current) {
        throw new Error("Video element initialization failed");
      }

      // Add a small delay to ensure video is ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Starting decode from video device...");
      await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            console.log("Barcode detected:", text);
            console.log("Barcode format:", result.getBarcodeFormat());
            console.log("Result data:", {
              format: result.getBarcodeFormat(),
              text: result.getText(),
              numBits: result.getNumBits(),
              timestamp: result.getTimestamp(),
            });
            setResult(text);
            stopScanning();
          }
          if (
            error &&
            error.name !== "NotFoundException" &&
            error.name !== "NotFoundException2"
          ) {
            console.log("Detection error:", error);
          }
        }
      );

      console.log("Decode started successfully");
    } catch (err) {
      console.error("Scanning error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      stopScanning();
    }
  }, [initializeCodeReader, stopScanning]);

  const handleManualInput = () => {
    const codeRegex = /^\d{4,13}$/;

    if (codeRegex.test(manualInput)) {
      setResult(manualInput);
      setManualInput("");
      setError("");
    } else {
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
              style={{
                minHeight: "300px",
                backgroundColor: "black",
                objectFit: "cover",
              }}
            />
            <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white border-dashed rounded-lg"></div>
              </div>
            </div>
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

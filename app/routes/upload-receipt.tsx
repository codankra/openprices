import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import { useState, useRef } from "react";
import { auth } from "../services/auth.server";
import { Upload, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createR2URL, uploadToR2 } from "~/services/r2.server";
import { detectReceiptText } from "~/services/vision.server";

interface UploadState {
  preview: string | null;
  error: string | null;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Upload Receipt to Add Prices" },
    {
      name: "description",
      content: "Upload the Store Receipt to Add Grocery Price History Data",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) return redirect("/login");
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const receipt = formData.get("receipt");

  if (!(receipt instanceof File)) {
    return json({ error: "No valid file uploaded", status: 400 });
  }

  if (receipt.size > 3 * 1024 * 1024) {
    return json({ error: "File size exceeds 3MB limit", status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(receipt.type)) {
    return json({
      error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed",
      status: 400,
    });
  }

  try {
    const receiptURL = createR2URL(`receipts/${Date.now()}-${receipt.name}`);
    const imageBuffer = Buffer.from(await receipt.arrayBuffer());
    const cloudflareResponse = uploadToR2(receiptURL, imageBuffer);
    const receiptText = await detectReceiptText(imageBuffer);
    console.log(receiptText);
    await Promise.all([cloudflareResponse]);

    return json({ success: true, url: cloudflareResponse });
  } catch (error) {
    return json({ error: "Failed to process receipt", status: 500 });
  }
};

export default function UploadReceipt() {
  const [uploadState, setUploadState] = useState<UploadState>({
    preview: null,
    error: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadState({ preview: null, error: "Please upload an image file" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadState({
        preview: reader.result as string,
        error: null,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="font-sans p-4 bg-ogprime min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Receipt</h1>

        <Form
          ref={formRef}
          method="post"
          encType="multipart/form-data"
          className="relative"
        >
          <div
            className={`
              border-2 border-dashed rounded-lg p-8
              ${uploadState.preview ? "border-green-500" : "border-gray-300"}
              transition-colors duration-200
              flex flex-col items-center justify-center
              min-h-[400px] bg-white
              relative
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="receipt"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {uploadState.preview ? (
              <div className="relative">
                <img
                  src={uploadState.preview}
                  alt="Receipt preview"
                  className="max-h-[350px] rounded-lg shadow-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadState({ preview: null, error: null });
                    formRef.current?.reset();
                  }}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Drop your receipt here
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  or click to select a file
                </p>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    Processing receipt...
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadState.preview && (
            <button
              type="submit"
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              disabled={isUploading}
            >
              Upload Receipt
            </button>
          )}
        </Form>

        {uploadState.error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{uploadState.error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Upload a clear photo of your receipt</li>
            <li>Make sure all items and prices are visible</li>
            <li>Supported formats: JPEG, PNG, GIF, WebP</li>
            <li>Maximum file size: 3MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// app/routes/barcode-detect.tsx
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useRef, useState } from "react";
import {
  testBarcodeDetection,
  testBasicDetection,
} from "~/services/vision.server";
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const imageFile = formData.get("image") as File;

  if (!imageFile) {
    return json(
      { error: "No image provided", barcodes: null },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const barcodes = await testBasicDetection(buffer);
    return json({ barcodes, error: null });
  } catch (error) {
    console.error("Error processing image:", error);
    return json(
      { error: "Failed to process image", barcodes: null },
      { status: 500 }
    );
  }
};

export default function BarcodeDetect() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isSubmitting = navigation.state === "submitting";

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Barcode Detection</h1>

      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Upload Image
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded
            hover:bg-blue-600 disabled:bg-blue-300 
            transition duration-150 ease-in-out"
        >
          {isSubmitting ? "Processing..." : "Detect Barcodes"}
        </button>
      </Form>

      {preview && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <img
            src={preview}
            alt="Preview"
            className="max-w-md rounded border border-gray-200"
          />
        </div>
      )}

      {actionData?.error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {actionData.error}
        </div>
      )}

      {actionData?.barcodes && actionData.barcodes.length > 0 && (
        <div className="mt-6 space-y-6">
          <h2 className="text-lg font-semibold">Detected Barcodes</h2>

          {actionData.barcodes.map((barcode, index) => (
            <div
              key={index}
              className="p-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Value:</span>{" "}
                  {barcode.barcode.value}
                </div>
                <div>
                  <span className="font-medium">Format:</span>{" "}
                  {barcode.barcode.format}
                </div>
                <div>
                  <span className="font-medium">Confidence:</span>{" "}
                  {(barcode.confidence * 100).toFixed(2)}%
                </div>
                {barcode.textValue && (
                  <div>
                    <span className="font-medium">Detected Text:</span>{" "}
                    {barcode.textValue}
                  </div>
                )}
                <div className="pt-2"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

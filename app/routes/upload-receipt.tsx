import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { auth } from "../services/auth.server";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { processReceiptInBackground } from "~/services/receipt.server";
import HeaderLinks from "~/components/custom/HeaderLinks";

interface UploadState {
  preview: string | null;
  error: string | null;
}

interface StatusItem {
  message: string;
  status: "completed" | "in-progress" | "not-started" | "error";
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
  const user = await auth.isAuthenticated(request);
  if (!user) return redirect("/login");
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

  const jobId = Date.now().toString();
  // Start processing in the background
  processReceiptInBackground(jobId, receipt, user.id).catch((e) => {
    console.error(e);
    return json({ error: "Failed to process receipt", status: 500 });
  });
  return json({ jobId });
};

export default function UploadReceipt() {
  const [uploadState, setUploadState] = useState<UploadState>({
    preview: null,
    error: null,
  });
  const [processingStatus, setProcessingStatus] = useState<StatusItem[]>([]);
  const [summary, setSummary] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";
  useEffect(() => {
    if (isUploading) {
      setProcessingStatus([]);
      setSummary("");
    }
  }, [isUploading]);

  const actionData = useActionData<typeof action>();
  useEffect(() => {
    if (actionData?.jobId) {
      const eventSource = new EventSource(`/sse/${actionData.jobId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setUploadState((prev) => ({ ...prev, error: data.error }));
            eventSource.close();
          } else if (data.completed) {
            setProcessingStatus(data.statusList);
            setSummary(data.summary);
            eventSource.close();
          } else {
            setProcessingStatus(data.statusList);
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };
      return () => eventSource.close();
    }
  }, [actionData]);
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

  const StatusIcon = ({ status }: { status: StatusItem["status"] }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="text-green-500" />;
      case "in-progress":
        return <Loader2 className="text-orange-500 animate-spin" />;
      case "not-started":
        return <CircleDashed className="text-gray-400" />;
      case "error":
        return <AlertCircle className="text-red-500" />;
    }
  };

  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <Link to={"/"}>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </Link>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Contribute Prices</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className=" font-bold">
                By Receipt Detection&nbsp;&nbsp;
              </BreadcrumbPage>
              <span> |</span>
              <Link to={"/price-entry"}>
                <BreadcrumbPage className="underline hover:bg-black/10 px-2 py-1 rounded transition-colors ml-0">
                  By Manual Entry
                </BreadcrumbPage>
              </Link>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Receipt Price Detector
          </h1>
          <span className="bg-green-950  text-white font-semibold text-lg  py-1 px-3 rounded ">
            {processingStatus.length > 0 ? "Processing" : "Ready"}
          </span>
        </div>

        <Form
          ref={formRef}
          method="post"
          encType="multipart/form-data"
          className="relative"
        >
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 shadow-lg
              ${uploadState.preview ? "border-ogfore" : "border-gray-300"}
              transition-colors duration-200
              flex flex-col items-center justify-center
              min-h-[400px] bg-white hover:bg-stone-100
              relative cursor-pointer
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
                  className="absolute -top-3 -right-3 p-1 bg-ogfore rounded-full text-white"
                >
                  <X size={24} />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Upload your receipt here
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  click to select a file
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
              className="mt-4 w-full bg-ogfore text-white py-2 px-4 rounded-lg hover:bg-ogfore-hover transition-colors shadow-xl"
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

        {processingStatus.length > 0 && (
          <div className="mt-4 bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Processing Status:</h3>
            <ul className="space-y-2">
              {processingStatus.map((status, index) => (
                <li
                  key={index}
                  className={`flex items-center space-x-2 transition-all duration-300 ease-in-out ${
                    status.status === "completed"
                      ? "text-green-600"
                      : status.status === "in-progress"
                      ? "text-orange-500"
                      : status.status === "error"
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  <StatusIcon status={status.status} />
                  <div
                    dangerouslySetInnerHTML={{
                      __html: `<p>${status.message}</p>`,
                    }}
                  ></div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary && (
          <div className="mt-4 bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Job Summary:</h3>
            <p>{summary}</p>
          </div>
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

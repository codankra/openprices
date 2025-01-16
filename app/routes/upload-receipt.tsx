import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router";
import { data } from "react-router";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { useState, useRef, useEffect } from "react";
import { requireAuth } from "../services/auth.server";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  ExternalLinkIcon,
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
import {
  processReceiptInBackground,
  ReceiptProcessResultsData,
} from "~/services/receipt.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import { FaExternalLinkSquareAlt } from "react-icons/fa";

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
    { title: "Receipt Price Detector" },
    {
      name: "description",
      content: "Upload the Store Receipt to Add Grocery Price History Data",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAuth(request, "/upload-receipt");
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireAuth(request, "/upload-receipt");
  const formData = await request.formData();
  const receipt = formData.get("receipt");

  if (!(receipt instanceof File)) {
    return data({ error: "No valid file uploaded" }, { status: 400 });
  }

  if (receipt.size > 3 * 1024 * 1024) {
    return data({ error: "File size exceeds 3MB limit" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(receipt.type)) {
    return data(
      {
        error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed",
      },
      { status: 400 }
    );
  }

  const jobId = Date.now().toString();
  // Start processing in the background
  processReceiptInBackground(jobId, receipt, user.id).catch((e) => {
    console.error(e);
    return data({ error: "Failed to process receipt" }, { status: 500 });
  });
  return { jobId };
};

export default function UploadReceipt() {
  const [uploadState, setUploadState] = useState<UploadState>({
    preview: null,
    error: null,
  });
  const [processingStatus, setProcessingStatus] = useState<StatusItem[]>([]);
  const [processSummary, setProcessSummary] =
    useState<ReceiptProcessResultsData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";
  useEffect(() => {
    if (isUploading) {
      setProcessingStatus([]);
      setProcessSummary(null);
    }
  }, [isUploading]);

  const actionData = useActionData<typeof action>();
  useEffect(() => {
    if (actionData && "jobId" in actionData) {
      const eventSource = new EventSource(`/sse/${actionData.jobId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setUploadState((prev) => ({ ...prev, error: data.error }));
            eventSource.close();
          } else if (data.completed) {
            setProcessingStatus(data.statusList);
            setProcessSummary(data.results);

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
        return <CircleDashed className="text-stone-400" />;
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
                Using a Receipt&nbsp;&nbsp;
              </BreadcrumbPage>
              <span> |</span>
              <Link to={"/price-entry"}>
                <BreadcrumbPage className="underline decoration-dotted underline-offset-4 hover:bg-black/10 px-2 py-1 rounded transition-colors ml-0">
                  Enter Price Manually
                </BreadcrumbPage>
              </Link>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap justify-between items-center">
          <h1 className="text-3xl font-bold text-stone-900 my-1 sm:my-0 mr-2">
            Receipt Price Detector
          </h1>
          {uploadState.error ? (
            <span className="bg-red-900  text-white font-semibold text-lg  py-1 px-3 rounded ">
              Error{" "}
            </span>
          ) : (
            <span className="bg-green-950  text-white font-semibold text-lg  py-1 px-3 rounded ">
              {processingStatus.length > 0
                ? processSummary
                  ? "Processed"
                  : "Processing"
                : "Ready"}
            </span>
          )}
        </div>

        {!processingStatus.length && (
          <Form
            ref={formRef}
            method="post"
            encType="multipart/form-data"
            className="relative"
          >
            <div
              className={`
              border-2 border-dashed rounded-lg p-8 shadow-lg
              ${uploadState.preview ? "border-ogfore" : "border-stone-300"}
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
                  <Upload className="mx-auto h-12 w-12 text-stone-400" />
                  <p className="mt-4 text-lg font-medium text-stone-900">
                    Upload your receipt here
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    click to select a file
                  </p>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-2 text-sm font-medium text-stone-900">
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
        )}

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
                      : "text-stone-400"
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

        {processSummary && (
          <div className="mt-4 bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Receipt Detection Summary:</h3>
            <div className="flex items-center mx-4 space-x-4">
              <p>{processSummary.summary}</p>
              <Link
                to={processSummary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-2 hover:bg-stone-200 rounded"
              >
                <ExternalLinkIcon className="w-8 h-8" />
                <p className="text-stone-600 text-xs text-center">
                  View&nbsp;Receipt
                </p>
              </Link>
            </div>

            <Link to={`/receipt/${processSummary.receiptId}`}>
              {" "}
              <button
                type="button"
                className="mt-4 w-full bg-ogfore hover:bg-ogfore-hover text-white font-bold py-3 px-6 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-ogfore-hover focus:ring-opacity-50"
              >
                Edit or View Results
              </button>
            </Link>
          </div>
        )}

        {(!processingStatus.length || uploadState.error) && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">
              Instructions to get the best receipt detection:
            </h2>
            <ul className="list-disc list-inside space-y-2 text-stone-600">
              <li className="flex flex-wrap gap-1">
                The receipt must be from one of our{" "}
                <Link
                  to="/supported-stores"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-ogfore hover:text-ogfore-hover underline decoration-dotted flex gap-1">
                    supported stores{" "}
                    <FaExternalLinkSquareAlt className="w-4 h-4" />
                  </span>
                </Link>{" "}
              </li>
              <li>Please make sure all items and prices are visible 🕵️</li>
              <li>Supported formats: JPEG, PNG, GIF, WebP 🖼️</li>
              <li>Maximum image file size: 3MB 🌐</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

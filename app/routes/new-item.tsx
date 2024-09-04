import {
  Form,
  useActionData,
  useNavigation,
  useLoaderData,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get("name");
  const price = formData.get("price");
  const date = formData.get("date");
  const proof = formData.get("proof");

  // Validate and process the data here
  if (true) {
    return { error: "Do not submit" };
  }
  // For example, you might want to save it to a database

  return redirect("/success"); // Redirect to a success page after submission
};

export const loader: LoaderFunction = async () => {
  // You can fetch any necessary data here
  // For example, you might want to fetch a list of categories or any other data needed for the form
  return json({ message: "Add your new price point" });
};

export default function NewPricePoint() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Price Point</h1>
      <Form method="post" encType="multipart/form-data">
        <div className="mb-4">
          <Label htmlFor="name">Item Name</Label>
          <Input type="text" id="name" name="name" required />
        </div>
        <div className="mb-4">
          <Label htmlFor="price">Price (USD)</Label>
          <Input
            type="number"
            id="price"
            name="price"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </div>
        <div className="mb-4">
          <Label>Date</Label>
          <Input
            type="date"
            min={`${new Date(1971, 0, 1)}`}
            max={new Date().toISOString().split("T")[0]}
            defaultValue={new Date().toISOString().split("T")[0]}
          />
          <input
            type="hidden"
            name="date"
            value={selectedDate?.toISOString() ?? ""}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="proof">Proof (Image)</Label>
          <Input
            type="file"
            id="proof"
            name="proof"
            accept="image/*"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
        </div>
        <Button type="submit" disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? "Submitting..." : "Submit"}
        </Button>
      </Form>
      {actionData?.error && (
        <p className="text-red-500 mt-4">{actionData.error}</p>
      )}
    </div>
  );
}

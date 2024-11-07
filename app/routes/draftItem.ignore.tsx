import { json, type ActionFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import { ignoreProductDraftItem } from "~/services/product.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await auth.isAuthenticated(request);
  if (!user) return json({ success: false }, { status: 401 });

  const formData = await request.formData();
  const id = Number(formData.get("id"));

  if (isNaN(id)) {
    return json({ success: false }, { status: 400 });
  }

  // Fire and forget the DB operation
  ignoreProductDraftItem(id).catch((error: any) =>
    console.error("Background ignore operation failed for id:", id, error)
  );

  // Return immediately
  return json({ success: true }, { status: 202 }); // 202 Accepted (Started Processing)
}

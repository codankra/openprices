import { data, LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import {
  getProductById,
  getProductIDByReceiptText,
} from "~/services/product.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Run auth check and param validation in parallel
  const [user, url] = await Promise.all([
    auth.isAuthenticated(request),
    Promise.resolve(new URL(request.url)),
  ]);

  if (!user) {
    return data(
      { success: false, message: "You must log in to use this API" },
      { status: 401 }
    );
  }

  const text = url.searchParams.get("text");
  const brand = url.searchParams.get("brand");
  console.log(brand);
  if (!text || !brand) {
    return data(
      {
        success: false,
        message: "We need more details to search for a product.",
      },
      { status: 400 }
    );
  }

  const pid = await getProductIDByReceiptText(text, brand);
  if (!pid)
    return data(
      { success: false, message: "Product Not Found" },
      { status: 404 }
    );
  const product = await getProductById(pid.toString());
  if (!product)
    return data(
      {
        success: false,
        message: "Product Receipt ID found, but its details could not be found",
      },
      { status: 404 }
    );
  else {
    return { success: true, message: "Product Found", product };
  }
}

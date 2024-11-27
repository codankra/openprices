import { data, LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import {
  getProductById,
  getProductIDByReceiptText,
} from "~/services/product.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await auth.isAuthenticated(request);
  if (!user)
    return data(
      { success: false, message: "You must log in to use this API" },
      { status: 401 }
    );
  const { text, brand } = params;
  if (!text || !brand)
    return data(
      {
        success: false,
        message: "We need more details to search for a product.",
      },
      { status: 400 }
    );

  const pid = await getProductIDByReceiptText(text, brand);
  if (!pid)
    return data(
      { success: false, message: "Product Not Found" },
      { status: 400 }
    );
  const product = await getProductById(pid.toString());
  if (!product)
    return data(
      { success: false, message: "Product Not Found" },
      { status: 400 }
    );
  else {
    return { success: true, message: "Product Found", product };
  }
}

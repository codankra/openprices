import { data, LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import { getProductByUpc } from "~/services/product.server";

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
  const upc = url.searchParams.get("upc");
  if (!upc) {
    return data(
      {
        success: false,
        message: "We need more details to search for a product.",
      },
      { status: 400 }
    );
  }
  const product = await getProductByUpc(upc);
  if (!product)
    return data(
      {
        success: false,
        message: "Product Not Found",
      },
      { status: 404 }
    );
  else {
    return { success: true, message: "Product Found", product };
  }
}

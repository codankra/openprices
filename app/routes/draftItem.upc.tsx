import { data, LoaderFunctionArgs } from "react-router";
import { checkAuth } from "~/services/auth.server";
import { getProductsByUpc } from "~/services/product.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Run auth check and param validation in parallel
  const [user, url] = await Promise.all([
    checkAuth(request),
    Promise.resolve(new URL(request.url)),
  ]);

  if (!user) {
    return Response.json(
      data({ success: false, message: "You must log in to use this API" }),
      { status: 401 }
    );
  }
  const upc = url.searchParams.get("upc");
  if (!upc) {
    return Response.json(
      data({
        success: false,
        message: "We need more details to search for a product upc.",
      }),
      { status: 400 }
    );
  }
  const products = await getProductsByUpc(upc); // This should now return an array
  if (!products || products.length === 0) {
    return Response.json(
      data({
        success: true,
        message: "No Products Found - No Content",
        code: 204,
      }),
      { status: 200 }
    );
  }

  return Response.json({
    success: true,
    message:
      products.length === 1 ? "Product Found" : "Multiple Products Found",
    products,
  });
}

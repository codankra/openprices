import { data, LoaderFunctionArgs } from "react-router";
import { checkAuth } from "~/services/auth.server";
import { getProductByUpc } from "~/services/product.server";

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
        message: "We need more details to search for a product.",
      }),
      { status: 400 }
    );
  }
  const product = await getProductByUpc(upc);
  if (!product)
    return Response.json(
      data({
        success: true,
        message: "Product Not Found - No Content",
        code: 204,
      }),
      { status: 200 }
    );
  else {
    return Response.json({ success: true, message: "Product Found", product });
  }
}

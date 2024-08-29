import type { LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export let loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") as string;
  return auth.authenticate(provider, request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

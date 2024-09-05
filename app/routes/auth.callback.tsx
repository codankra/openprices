import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { auth, sessionStorage } from "~/services/auth.server";

export let loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await sessionStorage.getSession(
    request.headers.get("cookie")
  );
  console.log(session.data);
  // Clear any existing flash messages
  session.unset("__flash_auth:error__");
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") as string;
  return await auth.authenticate(provider, request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login?error=auth_failed",
  });
};

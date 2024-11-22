import { type LoaderFunctionArgs } from "@remix-run/node";
import { auth, sessionStorage } from "~/services/auth.server";

export let loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await sessionStorage.getSession(
    request.headers.get("cookie")
  );

  // Clear any existing flash messages
  session.unset("__flash_auth:error__");
  const url = new URL(request.url);

  // Get the redirectTo from session or use default
  console.log(session.data);
  console.log(session.get("redirectTo"));
  const redirectTo = session.get("redirectTo") || "/account";
  console.log(redirectTo);

  // Clear the redirectTo from session
  session.unset("redirectTo");

  const provider = url.searchParams.get("provider") as string;
  return await auth.authenticate(provider, request, {
    successRedirect: redirectTo,
    failureRedirect: "/login?error=auth_failed",
  });
};

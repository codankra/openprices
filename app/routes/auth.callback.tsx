import { redirect, type LoaderFunctionArgs } from "react-router";
import { auth, sessionStorage } from "~/services/auth.server";

export let loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await sessionStorage.getSession(
    request.headers.get("cookie")
  );

  // Clear any existing flash messages
  session.unset("__flash_auth:error__");
  const url = new URL(request.url);

  // Get the redirectTo from session or use default
  const redirectTo = session.get("redirectTo") || "/account";

  try {
    const provider = url.searchParams.get("provider") as string;
    let user = await auth.authenticate(provider, request);
    session.set("user", user);
    return redirect(redirectTo ?? "/account", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  } catch (error) {
    console.error("Error Authenticating: ");
    console.error(error);
    throw redirect("/login?error=auth_failed", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  } finally {
    // Clear the redirectTo from session
    session.unset("redirectTo");
  }
};

// app/routes/auth.tsx
import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export let loader = () => redirect("/login");

type AuthType = "github" | "google";

export let action = async ({ request }: ActionFunctionArgs) => {
  const clonedRequest = request.clone();
  const body = await clonedRequest.formData();
  const authtype = body.get("authtype") as AuthType | null;

  if (!authtype || !["github", "google"].includes(authtype)) {
    return new Response("Invalid authentication type", {
      status: 400,
      statusText: "Bad Request",
    });
  }

  return auth.authenticate(authtype, request);
};

// app/routes/auth.google.tsx
import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export let loader = () => redirect("/login");

export let action = async ({ request }: ActionFunctionArgs) => {
  const clonedRequest = request.clone();
  const body = await clonedRequest.formData();
  const authtype = body.get("authtype");

  if (!authtype || typeof authtype !== "string") {
    return new Response("Invalid authentication type", {
      status: 400,
      statusText: "Bad Request",
    });
  }

  return auth.authenticate(authtype, request);
};

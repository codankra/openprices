import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { auth } from "../services/auth.server";

export const action: ActionFunction = async ({ request }) => {
  await auth.logout(request, { redirectTo: "/login" });
};

export const loader = async () => {
  return redirect("/login");
};

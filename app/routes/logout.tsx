import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { auth } from "../services/auth.server";

export const action: ActionFunction = async ({ request }) => {
  await auth.logout(request, { redirectTo: "/login" });
};

export const loader: LoaderFunction = async ({ request }) => {
  await auth.logout(request, { redirectTo: "/login" });
};
export default function Logout() {
  return <div>Logging out...</div>;
}

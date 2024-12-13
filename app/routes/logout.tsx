import {
  redirect,
  type ActionFunction,
  type LoaderFunction,
} from "react-router";
import { sessionStorage } from "~/services/auth.server";

export const action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
};

export const loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
};
export default function Logout() {
  return <div>Logging out...</div>;
}

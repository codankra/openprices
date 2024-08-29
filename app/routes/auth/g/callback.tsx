// app/routes/auth.google.callback.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export let loader = ({ request }: LoaderFunctionArgs) => {
  return auth.authenticate("google", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

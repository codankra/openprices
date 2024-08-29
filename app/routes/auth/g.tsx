// app/routes/auth.google.tsx
import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export let loader = () => redirect("/login");

export let action = ({ request }: ActionFunctionArgs) => {
  return auth.authenticate("google", request);
};

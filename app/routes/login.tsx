// app/routes/login.tsx
import { Form } from "@remix-run/react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "../services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // If the user is already authenticated redirect to /dashboard directly
  return await auth.isAuthenticated(request, {
    successRedirect: "/price-entry",
  });
}

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <Form action="/auth" method="post" className="mb-4">
          <button
            name="authtype"
            value="google"
            className="flex items-center justify-center w-64 px-4 py-2 text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <FcGoogle className="mr-2" />
            Sign in with Google
          </button>
        </Form>
        <Form action="/auth" method="post">
          <button
            disabled
            aria-disabled
            name="authtype"
            value="github"
            className="flex items-center justify-center w-64 px-4 py-2 text-white bg-gray-200 rounded-md  focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50  transition-all duration-200"
          >
            <FaGithub className="mr-2" />
            Sign in with GitHub
          </button>
        </Form>
      </div>
    </div>
  );
}

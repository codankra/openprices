// app/routes/login.tsx
import { Form, redirect } from "react-router";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import type { LoaderFunctionArgs } from "react-router";
import { checkAuth } from "../services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await checkAuth(request);
  if (user) throw redirect("/account");
}

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <Form action="/auth" method="post" className="mb-4">
          <button
            name="authtype"
            value="google"
            className="flex items-center justify-center w-64 px-4 py-2 text-stone-700 bg-white rounded-md border border-stone-200 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <FcGoogle className="mr-2" />
            Sign in with Google
          </button>
        </Form>
        <Form action="/auth" method="post">
          <button
            name="authtype"
            value="github"
            className="flex items-center justify-center w-64 px-4 py-2 text-white bg-gray-800 hover:bg-gray-700 rounded-md  focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50  transition-all duration-200"
          >
            <FaGithub className="mr-2" />
            Sign in with GitHub
          </button>
        </Form>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ogprime relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-60 -right-4 w-72 h-72 bg-ogfore-hover rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>{" "}
        <div className="absolute top-10 left-4 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -top-16 right-96 w-72 h-72 bg-stone-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-16 left-20 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-4xl font-bold text-stone-800 mb-2">
          OpenPriceData CPI Pal{" "}
        </h1>
        <p className="text-stone-600">Access your free contributor account</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-lg shadow-lg w-96 relative z-10">
        <h2 className="text-xl font-semibold text-stone-800 mb-2 text-center">
          Sign in to your account
        </h2>
        <p className="text-sm text-stone-600 mb-8 text-center">
          Build your price history and gain access to personalized price change
          analytics.{" "}
        </p>
        <Form action="/auth" method="post" className="mb-4">
          <button
            name="authtype"
            value="google"
            className="flex items-center justify-center w-full px-4 py-2 text-stone-700 bg-white rounded-md border border-stone-200 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <FcGoogle className="mr-2" />
            Sign in with Google
          </button>
        </Form>
        <Form action="/auth" method="post">
          <button
            name="authtype"
            value="github"
            className="flex items-center justify-center w-full px-4 py-2 text-white bg-gray-800 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50 transition-all duration-200"
          >
            <FaGithub className="mr-2" />
            Sign in with GitHub
          </button>
        </Form>
        {/* <p className="mt-6 text-xs text-center text-gray-500"> 
          Additional Sign In Message
        </p>*/}
      </div>
    </div>
  );
}

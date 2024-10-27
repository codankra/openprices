import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { auth } from "../services/auth.server";
import HeaderLinks from "~/components/custom/HeaderLinks";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }
  return json({ user });
};

export const meta: MetaFunction = () => {
  return [
    { title: "Account Dashboard - Open Price Data" },
    {
      name: "description",
      content:
        "Contributions - Statistics - Settings of Your User Profile Section of Open Price Data",
    },
  ];
};

export default function UserAccount() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="font-sans p-4 bg-gradient-to-b from-[#f7f2ec] to-[#efebe7] min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="space-y-4">
        <h1 className="text-3xl">Your Account </h1>

        <div>
          <h2 className="text-xl font-bold">Email</h2>
          <p className="">{user.email}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Name</h2>
          <p className="">{user.name}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Signed In With</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              {user.googleId && (
                <>
                  <span>Google</span>
                  <span className="text-green-600">✓</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user.githubId && (
                <>
                  <span>GitHub</span>
                  <span className="text-green-600">✓</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Form method="post" action="/logout">
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-stone-600 text-white rounded hover:bg-stone-700 transition-colors duration-200 flex items-center gap-2"
          >
            Log Out
          </button>
        </Form>
      </div>
    </div>
  );
}

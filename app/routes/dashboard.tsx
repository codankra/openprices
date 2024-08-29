import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { auth } from "../services/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) {
    return redirect("/login");
  }
  return json({ user });
};

export const meta: MetaFunction = () => {
  return [
    { title: "YAYA Dashboard" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="font-sans p-4 bg-gradient-to-b from-[#f7f2ec] to-[#efebe7] min-h-screen">
      <h1 className="text-3xl">
        How have Prices Really Changed? Explore Crowdsourced Data
      </h1>
      <div className="card">Contribute</div>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/quickstart"
            rel="noreferrer"
          >
            You made it to the dashboard!!
          </a>
        </li>
        <li>
          <pre>ABC</pre>
        </li>
        <li>
          <Form method="post" action="/logout">
            <button type="submit">Log Out</button>
          </Form>
        </li>
      </ul>
    </div>
  );
}

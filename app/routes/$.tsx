import type { LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import Custom404 from "~/components/custom/Custom404"; // Adjust the import path as needed

export const loader: LoaderFunction = async ({ request }) => {
  // You can add any additional logic here if needed
  // For example, logging 404 occurrences
  console.error(`[error] 404 Page not found at requested URL ${request.url}`);

  return { status: 404 };
};

export default function CatchAllRoute() {
  const data = useLoaderData();
  // @ts-ignore
  if (data.status === 404) {
    return (
      <div className="bg-ogprime flex flex-col items-center min-h-screen">
        {" "}
        <header className="bg-ogprime text-stone-900 ml-4 lg:self-start py-4 flex justify-between">
          <div className="flex items-center container mx-auto hover:text-stone-700">
            <Link to="/" className="flex items-center space-x-4">
              <img
                src="favicon.ico"
                width={40}
                height={40}
                alt="Open Price Data Logo"
                className="rounded"
              />
              <h1 className="text-2xl font-bold">Open Price Data</h1>
            </Link>
          </div>
        </header>
        <Custom404 />
      </div>
    );
  }

  // This shouldn't happen, but just in case
  return <div>Unexpected error</div>;
}

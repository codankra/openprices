import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Custom404 from "~/components/custom/Custom404"; // Adjust the import path as needed
import HeaderLinks from "~/components/custom/HeaderLinks";

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
        <header className="w-full">
          <HeaderLinks />{" "}
        </header>
        <section className="flex-grow w-full items-center h-full">
          <Custom404 />
        </section>
      </div>
    );
  }

  // This shouldn't happen, but just in case
  return <div>Unexpected error</div>;
}

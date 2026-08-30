import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { requireAuth } from "~/services/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireAuth(request, "/account");
  return { user };
};

export const meta: MetaFunction = () => {
  return [{ title: "Profile - Open Price Data" }];
};

export default function ProfileSection() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Email</h2>
        <p className="">{user.email}</p>
      </div>
      <div>
        <h2 className="text-xl font-bold">Name</h2>
        <p className="">{user.name}</p>
      </div>
      <div className="flex items-center">
        <div className="mr-8">
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
        </div>{" "}
        <Form method="post" action="/logout">
          <button
            type="submit"
            className="px-4 py-2 bg-stone-600 text-white rounded hover:bg-stone-700 transition-colors duration-200 flex items-center gap-2"
          >
            Log Out
          </button>
        </Form>
      </div>
    </div>
  );
}

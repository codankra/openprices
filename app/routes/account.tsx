import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Await, Form, useLoaderData } from "react-router";
import { requireAuth } from "../services/auth.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import { getUserContributionsById } from "~/services/user.server";
import { Suspense } from "react";
import {
  EmptyState,
  PriceEntryItem,
  ReceiptItem,
} from "~/components/custom/receipt/ContributionHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Receipt, Tag } from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireAuth(request);
  let userContributionsPromise = getUserContributionsById(user.id);
  return { user, userContributions: userContributionsPromise };
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
  const { user, userContributions } = useLoaderData<typeof loader>();
  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="space-y-4 max-w-6xl mx-auto p-4">
        <h1 className="text-3xl">Your Account </h1>

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

        <div>
          <div className="flex space-x-2">
            <h2 className="text-xl font-bold">Contribution History</h2>
            <h3 className="text-lg font-normal text-stone-500">past 30 days</h3>
          </div>
          <div className="flex flex-col ">
            <Suspense
              fallback={
                <div className="text-stone-700">Loading contributions...</div>
              }
            >
              <Await
                resolve={userContributions}
                errorElement={<div>Error loading Contributions</div>}
              >
                {(resolvedUserContributions) => (
                  <Tabs defaultValue="receipts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger
                        value="receipts"
                        className="flex items-center gap-2"
                      >
                        <Receipt className="w-4 h-4" />
                        Receipts
                      </TabsTrigger>
                      <TabsTrigger
                        value="prices"
                        className="flex items-center gap-2"
                      >
                        <Tag className="w-4 h-4" />
                        Price Entries
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="receipts">
                      {resolvedUserContributions.userReceipts &&
                      resolvedUserContributions.userReceipts.length > 0 ? (
                        resolvedUserContributions.userReceipts.map(
                          (receipt: any) => (
                            <ReceiptItem key={receipt.id} receipt={receipt} />
                          )
                        )
                      ) : (
                        <EmptyState type="receipts" />
                      )}
                    </TabsContent>

                    <TabsContent value="prices">
                      {resolvedUserContributions.userPriceEntries &&
                      resolvedUserContributions.userPriceEntries.length > 0 ? (
                        resolvedUserContributions.userPriceEntries.map(
                          (entry: any) => (
                            <PriceEntryItem key={entry.id} entry={entry} />
                          )
                        )
                      ) : (
                        <EmptyState type="price entries" />
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </Await>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { priceEntries, receipts } from "~/db/schema";

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
                {(resolvedUserContributions) => {
                  type ReceiptWithType = typeof receipts.$inferInsert & {
                    type: "receipt";
                  };

                  type PriceEntryWithType = typeof priceEntries.$inferInsert & {
                    type: "price";
                  };

                  type Contribution = ReceiptWithType | PriceEntryWithType;

                  const allContributions: Contribution[] = [
                    ...(resolvedUserContributions.userReceipts || []).map(
                      (receipt): ReceiptWithType => ({
                        ...receipt,
                        type: "receipt",
                      })
                    ),
                    ...(resolvedUserContributions.userPriceEntries || []).map(
                      (entry): PriceEntryWithType => ({
                        ...entry,
                        type: "price",
                      })
                    ),
                  ].sort((a, b) => {
                    const dateA = a.createdAt
                      ? new Date(a.createdAt)
                      : new Date(0);
                    const dateB = b.createdAt
                      ? new Date(b.createdAt)
                      : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  });
                  // Group contributions by date
                  const groupedContributions = allContributions.reduce(
                    (groups, contribution) => {
                      const date = new Date(contribution.createdAt ?? 0);
                      const dateKey = date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      });

                      if (!groups[dateKey]) {
                        groups[dateKey] = [];
                      }
                      groups[dateKey].push(contribution);
                      return groups;
                    },
                    {} as Record<string, typeof allContributions>
                  );

                  return allContributions.length > 0 ? (
                    <div className="relative space-y-8 pl-8">
                      {/* Vertical Timeline Line */}
                      <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-stone-200" />

                      {Object.entries(groupedContributions).map(
                        ([date, contributions], index) => (
                          <div key={date} className="relative">
                            {/* Date Header with Dot */}
                            <div className="flex items-center mb-4 -ml-8">
                              <div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-stone-300 z-10" />
                              <h3 className="text-lg font-semibold text-stone-700 ml-2">
                                {date}
                              </h3>
                            </div>

                            {/* Contributions for this date */}
                            <div className="space-y-4">
                              {contributions.map((contribution) => (
                                <div
                                  key={`${contribution.type}-${contribution.id}`}
                                  className="relative pl-6"
                                >
                                  {/* Small connector line */}
                                  <div className="absolute left-[-12px] top-1/2 w-4 h-[2px] bg-stone-200" />

                                  {contribution.type === "receipt" ? (
                                    <ReceiptItem receipt={contribution} />
                                  ) : (
                                    <PriceEntryItem entry={contribution} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <EmptyState />
                  );
                }}
              </Await>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

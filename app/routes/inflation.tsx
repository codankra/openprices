import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Await, useLoaderData } from "react-router";
import { Suspense, useMemo, useState } from "react";
import { format } from "date-fns";
import { requireAuth } from "~/services/auth.server";
import {
  getUserInflationStats,
  type UserInflationStats,
  type ProductInflationStats,
} from "~/services/inflation.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import InflationChart from "~/components/custom/InflationChart";
import InflationSkeleton from "~/components/custom/InflationSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireAuth(request);
  // Don't await - this can be a heavier query over a user's full price
  // history, so we stream it in behind a Suspense boundary instead of
  // blocking the initial response (see account.tsx for the same pattern).
  const inflationStatsPromise = getUserInflationStats(user.id);
  return { user, inflationStats: inflationStatsPromise };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Your Inflation Tracker - Open Price Data" },
    {
      name: "description",
      content:
        "See how the prices of products you've personally logged have changed over time.",
    },
  ];
};

export default function InflationPage() {
  const { inflationStats } = useLoaderData<typeof loader>();

  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-3xl text-stone-900">Your Inflation Tracker</h1>
          <p className="text-stone-600">
            Built from the prices you&apos;ve personally logged, over time.
          </p>
        </div>

        <Suspense fallback={<InflationSkeleton />}>
          <Await
            resolve={inflationStats}
            errorElement={
              <div className="bg-white rounded-lg shadow-md p-6 text-stone-700">
                Something went wrong loading your inflation stats. Please try
                refreshing the page.
              </div>
            }
          >
            {(stats) => <InflationDashboard stats={stats} />}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function formatPct(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function pctColorClass(value: number | null) {
  if (value === null) return "text-stone-800";
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-stone-800";
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy");
}

function InflationDashboard({ stats }: { stats: UserInflationStats }) {
  const { products, basket } = stats;

  // Default to whichever product has seen the most discrete price changes -
  // usually the most interesting one to land on.
  const defaultProductId = useMemo(() => {
    if (products.length === 0) return null;
    return [...products].sort((a, b) => b.changes.length - a.changes.length)[0]
      .productId;
  }, [products]);

  const [selectedId, setSelectedId] = useState<number | null>(
    defaultProductId
  );

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-stone-700">
        You haven&apos;t logged any price entries yet. Once you contribute a few
        prices, your personal inflation stats will show up here.
      </div>
    );
  }

  const selected =
    products.find((p) => p.productId === selectedId) ?? products[0];

  return (
    <div className="space-y-4">
      <BasketSummary basket={basket} />

      <div className="w-full sm:w-72">
        <Select
          value={String(selected.productId)}
          onValueChange={(value) => setSelectedId(Number(value))}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Choose a product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.productId} value={String(p.productId)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ProductMetrics product={selected} />

      <div className="bg-gradient-to-br from-stone-100 to-orange-50 rounded-lg shadow-md p-4">
        <InflationChart points={selected.points} />
      </div>

      <ChangeLog product={selected} />
    </div>
  );
}

function BasketSummary({ basket }: { basket: UserInflationStats["basket"] }) {
  const { weightedAnnualizedPct, eligibleProductCount, totalProductCount } =
    basket;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-1">
        Lifetime annualized inflation - your basket
      </h2>
      {weightedAnnualizedPct === null ? (
        <p className="text-stone-600">
          Not enough long-running price history yet to compute a lifetime
          annualized rate for your basket. A product needs at least a year of
          tracked history (with a couple of price checks) to count - keep
          logging prices!
        </p>
      ) : (
        <>
          <p
            className={`text-4xl font-bold ${pctColorClass(
              weightedAnnualizedPct
            )}`}
          >
            {formatPct(weightedAnnualizedPct)}
            <span className="text-lg font-normal text-stone-500"> /yr</span>
          </p>
          <p className="text-sm text-stone-500 mt-2">
            Based on {eligibleProductCount} of {totalProductCount} tracked
            product{totalProductCount === 1 ? "" : "s"} with at least a year
            of history.{" "}
            {basket.earliestDate && basket.latestDate && (
              <>
                Data spans {formatDate(basket.earliestDate)} to{" "}
                {formatDate(basket.latestDate)}.
              </>
            )}
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Equal-weighted per good: each eligible product&apos;s own
            annualized rate is weighted by its baseline price (assuming you
            buy 1 of each) and by how many years it&apos;s been tracked.
          </p>
        </>
      )}
    </div>
  );
}

function ProductMetrics({ product }: { product: ProductInflationStats }) {
  const yearsTracked = product.totalDays / 365;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard label="First logged" value={`$${product.firstPrice.toFixed(2)}`} />
      <MetricCard label="Latest" value={`$${product.lastPrice.toFixed(2)}`} />
      <MetricCard
        label="Total change"
        value={formatPct(product.totalPctChange)}
        valueClassName={pctColorClass(product.totalPctChange)}
      />
      <MetricCard
        label="Lifetime annualized"
        value={
          product.lifetimeAnnualizedPct === null
            ? "—"
            : `${formatPct(product.lifetimeAnnualizedPct, 1)}/yr`
        }
        valueClassName={pctColorClass(product.lifetimeAnnualizedPct)}
      />
      <MetricCard label="Tracked span" value={`${yearsTracked.toFixed(1)} yrs`} />
      <MetricCard label="Discrete changes" value={String(product.changes.length)} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClassName = "text-stone-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function ChangeLog({ product }: { product: ProductInflationStats }) {
  if (product.changes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 text-stone-600 text-sm">
        No price changes recorded across {product.points.length} observation
        {product.points.length === 1 ? "" : "s"}.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 divide-y divide-stone-200">
      {product.changes.map((change, i) => (
        <div
          key={i}
          className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-sm"
        >
          <div className="text-stone-600">
            {formatDate(change.fromDate)} → {formatDate(change.toDate)}
            <span className="ml-2 text-stone-900">
              ${change.fromPrice.toFixed(2)} → ${change.toPrice.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <div className={`font-semibold ${pctColorClass(change.pctChange)}`}>
              {formatPct(change.pctChange)}
            </div>
            <div className="text-xs text-stone-400">
              {change.daysElapsed >= 30 && change.annualizedPct !== null
                ? `${formatPct(change.annualizedPct)}/yr annualized`
                : `${Math.round(change.daysElapsed)}d gap`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { priceEntries, products } from "~/db/schema";
import { db } from "~/db/index";
import { eq } from "drizzle-orm";
import { userInflationStatsCache } from "~/db/cache";
import { withRetry } from "~/lib/utils";

const MS_PER_DAY = 86_400_000;

// A product only gets an annualized rate (and only counts toward the
// basket-level stat) once it has enough history to make "per year" math
// meaningful. These mirror the thresholds used for the community-wide
// eligibility query (recent activity, >= 1yr of span, >= 2 observations).
const RECENCY_WINDOW_DAYS = 182; // ~6 months
const MIN_SPAN_DAYS = 365;
const MIN_OBSERVATIONS = 2;

export interface InflationPoint {
  date: string;
  price: number;
}

export interface InflationChange {
  fromDate: string;
  toDate: string;
  fromPrice: number;
  toPrice: number;
  pctChange: number;
  daysElapsed: number;
  annualizedPct: number | null; // null only if daysElapsed is 0 (shouldn't happen in practice)
}

export interface ProductInflationStats {
  productId: number;
  name: string;
  category: string | null;
  points: InflationPoint[];
  changes: InflationChange[];
  firstDate: string;
  lastDate: string;
  firstPrice: number;
  lastPrice: number;
  totalDays: number;
  totalPctChange: number;
  isEligibleForAnnualization: boolean;
  lifetimeAnnualizedPct: number | null;
}

export interface UserInflationStats {
  products: ProductInflationStats[];
  basket: {
    totalProductCount: number;
    eligibleProductCount: number;
    earliestDate: string | null;
    latestDate: string | null;
    // Equal-weighted-per-good average CAGR across eligible products, where
    // each product's CAGR is weighted by (its baseline price) x (years
    // tracked) - see computeBasketWeightedAnnualizedPct for the full
    // rationale.
    weightedAnnualizedPct: number | null;
  };
}

type RawEntryRow = {
  productId: number | null;
  productName: string;
  category: string | null;
  price: number;
  date: string;
};

/**
 * Groups a flat list of price entry rows into per-product point/change
 * series and derives lifetime + basket-level annualized inflation stats.
 * Pure function (no I/O) so it's easy to unit test independent of the DB.
 */
export function computeUserInflationStats(
  rows: RawEntryRow[]
): UserInflationStats {
  const byProduct = new Map<number, RawEntryRow[]>();
  for (const row of rows) {
    if (row.productId == null) continue;
    const existing = byProduct.get(row.productId);
    if (existing) existing.push(row);
    else byProduct.set(row.productId, [row]);
  }

  const now = Date.now();
  const productStats: ProductInflationStats[] = [];

  for (const [productId, entries] of byProduct) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Collapse multiple entries recorded on the same date down to one point
    // (keep the latest-recorded price for that date) so the chart and the
    // discrete-change log both read cleanly.
    const points: InflationPoint[] = [];
    for (const entry of sorted) {
      const last = points[points.length - 1];
      if (last && last.date === entry.date) {
        last.price = entry.price;
      } else {
        points.push({ date: entry.date, price: entry.price });
      }
    }
    if (points.length === 0) continue;

    const changes: InflationChange[] = [];
    let cursor = points[0];
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (point.price === cursor.price) continue;

      const daysElapsed =
        (new Date(point.date).getTime() - new Date(cursor.date).getTime()) /
        MS_PER_DAY;
      const pctChange = ((point.price - cursor.price) / cursor.price) * 100;
      const annualizedPct =
        daysElapsed > 0
          ? (Math.pow(point.price / cursor.price, 365 / daysElapsed) - 1) *
            100
          : null;

      changes.push({
        fromDate: cursor.date,
        toDate: point.date,
        fromPrice: cursor.price,
        toPrice: point.price,
        pctChange,
        daysElapsed,
        annualizedPct,
      });
      cursor = point;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const totalDays =
      (new Date(lastPoint.date).getTime() -
        new Date(firstPoint.date).getTime()) /
      MS_PER_DAY;
    const totalPctChange =
      firstPoint.price > 0
        ? ((lastPoint.price - firstPoint.price) / firstPoint.price) * 100
        : 0;
    const daysSinceLastObservation =
      (now - new Date(lastPoint.date).getTime()) / MS_PER_DAY;

    const isEligibleForAnnualization =
      points.length >= MIN_OBSERVATIONS &&
      totalDays >= MIN_SPAN_DAYS &&
      daysSinceLastObservation <= RECENCY_WINDOW_DAYS;

    const lifetimeAnnualizedPct =
      isEligibleForAnnualization && totalDays > 0
        ? (Math.pow(lastPoint.price / firstPoint.price, 365 / totalDays) - 1) *
          100
        : null;

    productStats.push({
      productId,
      name: entries[0].productName,
      category: entries[0].category,
      points,
      changes,
      firstDate: firstPoint.date,
      lastDate: lastPoint.date,
      firstPrice: firstPoint.price,
      lastPrice: lastPoint.price,
      totalDays,
      totalPctChange,
      isEligibleForAnnualization,
      lifetimeAnnualizedPct,
    });
  }

  productStats.sort((a, b) => a.name.localeCompare(b.name));

  const basket = computeBasketStats(productStats);

  return { products: productStats, basket };
}

/**
 * Basket-level "lifetime annualized inflation rate", equal-weighted per
 * good, assuming you buy exactly 1 unit of each eligible good:
 *
 *   weight_i          = firstPrice_i * yearsTracked_i
 *   weightedAvgCAGR    = sum(weight_i * CAGR_i) / sum(weight_i)
 *
 * Why this weighting:
 * - "price-weighted, assuming 1 of each good is bought": a good's dollar
 *   cost (its baseline/first observed price) sets how much it should count
 *   toward a basket total, the same way a $4 carton of eggs moves your
 *   grocery bill more than a $0.20 banana does.
 * - "time-weighted": a CAGR estimated from 3 years of history is a more
 *   reliable, more representative figure than one estimated from 366 days.
 *   Weighting by years-tracked gives longer-observed goods proportionally
 *   more influence, similar to how a time-weighted portfolio return
 *   weights sub-periods by their duration.
 *
 * Only products meeting isEligibleForAnnualization are included, since a
 * CAGR computed over less than a year (or from a single data point) is
 * not a meaningful annualized rate - it would swing wildly based on a
 * single restock or short-lived sale price, the same way one 14-day, 30%
 * swing shouldn't be read as a "+100,000%/yr" trend.
 */
function computeBasketStats(
  productStats: ProductInflationStats[]
): UserInflationStats["basket"] {
  const allDates = productStats.flatMap((p) => [p.firstDate, p.lastDate]);
  const earliestDate = allDates.length
    ? allDates.reduce((min, d) => (d < min ? d : min))
    : null;
  const latestDate = allDates.length
    ? allDates.reduce((max, d) => (d > max ? d : max))
    : null;

  const eligible = productStats.filter(
    (p) => p.isEligibleForAnnualization && p.lifetimeAnnualizedPct !== null
  );

  let weightedAnnualizedPct: number | null = null;
  if (eligible.length > 0) {
    let weightTotal = 0;
    let weightedRateTotal = 0;
    for (const p of eligible) {
      const yearsTracked = p.totalDays / 365;
      const weight = p.firstPrice * yearsTracked;
      weightTotal += weight;
      weightedRateTotal += weight * (p.lifetimeAnnualizedPct as number);
    }
    weightedAnnualizedPct = weightTotal > 0 ? weightedRateTotal / weightTotal : null;
  }

  return {
    totalProductCount: productStats.length,
    eligibleProductCount: eligible.length,
    earliestDate,
    latestDate,
    weightedAnnualizedPct,
  };
}

/**
 * Loads every price entry a user has personally contributed, joined with
 * product name/category, and reduces it to per-product + basket inflation
 * stats. Cached per-user for 24h since this walks a user's full price
 * history rather than a bounded recent window.
 *
 * Note on the community "eligible products" query this was modeled after:
 * that query uses a CTE + window functions (ROW_NUMBER/FIRST_VALUE) because
 * it's filtering and ranking across the *entire* cross-user PriceEntries
 * table before it can even get to per-product first/last prices. Here we
 * already scope to a single contributor up front, so the result set is
 * small (one person's own entries) - pulling every row back with a single
 * indexed WHERE + JOIN and doing the grouping/eligibility/CAGR math in JS
 * is both simpler and faster than asking SQLite to run window functions
 * over what is, per-user, a tiny table scan.
 */
export async function getUserInflationStats(
  userId: string
): Promise<UserInflationStats> {
  return withRetry(async () => {
    const cached: UserInflationStats | undefined =
      await userInflationStatsCache.get(userId);
    if (cached) return cached;

    try {
      const rows = await db
        .select({
          productId: priceEntries.productId,
          productName: products.name,
          category: products.category,
          price: priceEntries.price,
          date: priceEntries.date,
        })
        .from(priceEntries)
        .innerJoin(products, eq(priceEntries.productId, products.id))
        .where(eq(priceEntries.contributorId, userId))
        .orderBy(products.name, priceEntries.date);

      const stats = computeUserInflationStats(rows);
      await userInflationStatsCache.set(userId, stats);
      return stats;
    } catch (error) {
      console.error(`Error computing inflation stats for user ${userId}:`, error);
      throw new Error(`Failed to compute inflation stats for user ${userId}`);
    }
  });
}

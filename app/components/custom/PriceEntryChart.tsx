import React, { useMemo } from "react";
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";

interface PriceEntry {
  id: number;
  price: number;
  date: string;
}

interface PriceChartProps {
  priceEntries: PriceEntry[];
}

const PriceChart: React.FC<PriceChartProps> = ({ priceEntries }) => {
  const chartData = useMemo(() => {
    return priceEntries.map((entry) => ({
      x: new Date(entry.date).getTime(),
      y: entry.price,
      // Keep original data for tooltip
      date: entry.date,
      price: entry.price,
    }));
  }, [priceEntries]);

  const lineBestFit = useMemo(() => {
    const n = chartData.length;
    const sumX = chartData.reduce((sum, point) => sum + point.x, 0);
    const sumY = chartData.reduce((sum, point) => sum + point.y, 0);
    const sumXY = chartData.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = chartData.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...chartData.map((point) => point.x));
    const maxX = Math.max(...chartData.map((point) => point.x));

    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ];
  }, [chartData]);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart margin={{ top: 20, right: 40, bottom: 20, left: 20 }}>
        <CartesianGrid />
        <XAxis
          dataKey="x"
          type="number"
          name="Date"
          domain={["auto", "auto"]}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
          angle={-25}
          textAnchor="end"
          height={70}
          tickMargin={5}
        />
        <YAxis dataKey="y" name="Price" unit="$" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload, coordinate }) => {
            // Return null (hide tooltip) if no valid data
            if (!active || !payload || !payload[0]?.payload) {
              return null;
            }

            const data = payload[0].payload;

            // Check if we have valid date and price
            if (!data.date || typeof data.price !== "number") {
              return null;
            }

            try {
              return (
                <div
                  className="bg-white p-2 border rounded shadow transition-opacity duration-200 whitespace-nowrap"
                  style={{
                    opacity: active ? 1 : 0,
                    transform: "translate(-50%, -100%)",
                    position: "absolute",
                    left: typeof coordinate?.x === "number" ? coordinate.x : 0,
                    top:
                      typeof coordinate?.y === "number" ? coordinate.y - 20 : 0,
                    pointerEvents: "none",
                  }}
                >
                  <p className="text-sm">
                    Date: {new Date(data.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold ">
                    Price: ${data.price.toFixed(2)}
                  </p>
                </div>
              );
            } catch (error) {
              console.error("Tooltip render error:", error);
              return null;
            }
          }}
          wrapperStyle={{ outline: "none" }}
        />
        <Legend />
        <Line
          name="Price Trend"
          data={lineBestFit}
          type="linear"
          dataKey="y"
          stroke="#f97316" // Tailwind orange-500
          strokeWidth={2}
          dot={false}
          connectNulls
          activeDot={false}
          style={{ pointerEvents: "none" }}
        />
        <Scatter
          name="Price Entries"
          data={chartData}
          fill="#78716c" // Tailwind stone-500
          style={{ cursor: "pointer" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;

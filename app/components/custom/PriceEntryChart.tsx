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
  Area,
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

  const lineData = useMemo(() => {
    return chartData.map((point) => ({
      x: point.x,
      y: point.y,
    }));
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
        <Area
          name="Price Trend"
          data={lineData}
          type="monotone"
          dataKey="y"
          stroke="#f97316" // Tailwind orange-500
          strokeWidth={2}
          dot={false}
          connectNulls
          activeDot={false}
          style={{ pointerEvents: "none" }}
          fill="#fed7aa" // Tailwind orange-200
          fillOpacity={0.3}
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

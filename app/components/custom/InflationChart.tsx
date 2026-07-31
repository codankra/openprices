import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface InflationChartPoint {
  date: string;
  price: number;
}

interface InflationChartProps {
  points: InflationChartPoint[];
}

const InflationChart: React.FC<InflationChartProps> = ({ points }) => {
  const chartData = useMemo(
    () =>
      points.map((point) => ({
        x: new Date(point.date).getTime(),
        y: point.price,
        date: point.date,
        price: point.price,
      })),
    [points]
  );

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["auto", "auto"]}
          tickFormatter={(unixTime) =>
            new Date(unixTime).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          }
          angle={-25}
          textAnchor="end"
          height={60}
          tickMargin={5}
          tick={{ fontSize: 12, fill: "#78716c" }}
        />
        <YAxis
          dataKey="y"
          tickFormatter={(value) => `$${value.toFixed(2)}`}
          tick={{ fontSize: 12, fill: "#78716c" }}
          domain={["auto", "auto"]}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload[0]?.payload) return null;
            const data = payload[0].payload;
            if (!data.date || typeof data.price !== "number") return null;
            return (
              <div className="bg-white p-2 border border-stone-200 rounded shadow text-sm">
                <p>{new Date(data.date).toLocaleDateString()}</p>
                <p className="font-semibold">${data.price.toFixed(2)}</p>
              </div>
            );
          }}
        />
        <Line
          type="stepAfter"
          dataKey="y"
          stroke="#f97316" // Tailwind orange-500, matches PriceEntryChart
          strokeWidth={2}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Scatter dataKey="y" fill="#78716c" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default InflationChart;

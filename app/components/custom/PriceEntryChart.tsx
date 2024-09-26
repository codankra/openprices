import React, { useMemo } from "react";
import {
  ScatterChart,
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
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid />
        <XAxis
          dataKey="x"
          type="number"
          name="Date"
          domain={["auto", "auto"]}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
        />
        <YAxis dataKey="y" name="Price" unit="$" />
        <Tooltip
          formatter={(value, name) => {
            if (name === "Date")
              return new Date(value as number).toLocaleDateString();
            return [`$${(value as number).toFixed(2)}`, name];
          }}
        />
        <Legend />
        <Scatter name="Price Entries" data={chartData} fill="#8884d8" />
        <Line
          name="Trend Line"
          data={lineBestFit}
          type="linear"
          dataKey="y"
          stroke="#ff7300"
          dot={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;

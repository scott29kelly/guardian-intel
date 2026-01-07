"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface PipelineData {
  stage: string;
  count: number;
  value: number;
}

interface PipelineChartProps {
  data: PipelineData[];
}

const COLORS = [
  "#8b5cf6", // purple - new
  "#6366f1", // indigo - contacted
  "#0ca5e9", // guardian blue - qualified
  "#f59e0b", // amber - proposal
  "#f97316", // accent orange - negotiation
  "#10b981", // emerald - closed won
];

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <YAxis
            type="category"
            dataKey="stage"
            stroke="#64748b"
            fontSize={12}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
            labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: 8 }}
            itemStyle={{ color: "#94a3b8" }}
            formatter={(value: number, name: string) => [
              name === "value" ? formatCurrency(value) : value,
              name === "value" ? "Pipeline Value" : "Deals",
            ]}
          />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                style={{
                  filter: `drop-shadow(0 0 8px ${COLORS[index % COLORS.length]}40)`,
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

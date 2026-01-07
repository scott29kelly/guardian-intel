"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendData {
  day: string;
  leads: number;
  calls: number;
  deals: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ca5e9" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0ca5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
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
          />
          <Legend
            iconType="circle"
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorLeads)"
            name="New Leads"
          />
          <Area
            type="monotone"
            dataKey="calls"
            stroke="#0ca5e9"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCalls)"
            name="Calls Made"
          />
          <Area
            type="monotone"
            dataKey="deals"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDeals)"
            name="Deals Closed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

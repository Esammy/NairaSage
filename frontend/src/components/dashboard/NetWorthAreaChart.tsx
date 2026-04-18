"use client";

import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type Row = { name: string; value: number };

export function NetWorthAreaChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} hide />
        <Tooltip
          contentStyle={{
            backgroundColor: "#121212",
            borderColor: "#27272a",
            borderRadius: "8px",
          }}
          formatter={() => ["No time-series data yet", ""]}
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#d4af37"
          strokeWidth={2}
          strokeOpacity={0.35}
          fillOpacity={1}
          fill="url(#colorValue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

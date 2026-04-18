"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number };

const PIE_COLORS = ["#d4af37", "#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#ec4899", "#64748b"];

export function PortfolioPieSection({ data }: { data: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#121212",
            borderColor: "#27272a",
            borderRadius: "8px",
          }}
          itemStyle={{ color: "#f8fafc" }}
          formatter={(value) => [`${typeof value === "number" ? value : Number(value) || 0}%`, "Weight"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

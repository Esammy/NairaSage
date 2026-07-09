"use client";

// Semi-circular Freedom Ratio gauge. 0..2x range; 1.0 marker is the "rat race exit".
// Pure SVG so it renders identically on server and client.

import React from "react";

export function FreedomRatioGauge({
  ratio,
  passiveIncome,
  monthlyExpenses,
  size = 280,
}: {
  ratio: number;
  passiveIncome?: string | number;
  monthlyExpenses?: string | number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(2, ratio || 0));
  const pct = clamped / 2;
  const radius = size / 2 - 24;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const needleAngle = startAngle + pct * (endAngle - startAngle);

  const arc = (from: number, to: number) => {
    const x1 = cx + radius * Math.cos(from);
    const y1 = cy + radius * Math.sin(from);
    const x2 = cx + radius * Math.cos(to);
    const y2 = cy + radius * Math.sin(to);
    const largeArc = to - from > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const ratcheatAngle = startAngle + 0.5 * (endAngle - startAngle);
  const exitX = cx + (radius + 14) * Math.cos(ratcheatAngle);
  const exitY = cy + (radius + 14) * Math.sin(ratcheatAngle);

  const needleLen = radius - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  const ratioLabel = clamped >= 1 ? "Out of the rat race" : "On the ladder";

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.62}
        viewBox={`0 0 ${size} ${size * 0.62}`}
        role="img"
        aria-label={`Freedom Ratio ${clamped.toFixed(2)}. ${ratioLabel}.`}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        tabIndex={0}
      >
        <defs>
          <linearGradient id="freedom-track" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b3a3a" />
            <stop offset="50%" stopColor="#b8a06a" />
            <stop offset="100%" stopColor="#2d9f6f" />
          </linearGradient>
        </defs>
        <path
          d={arc(startAngle, endAngle)}
          fill="none"
          stroke="url(#freedom-track)"
          strokeWidth={18}
          strokeLinecap="round"
          opacity={0.25}
        />
        <path
          d={arc(startAngle, startAngle + pct * (endAngle - startAngle) || startAngle + 0.001)}
          fill="none"
          stroke="url(#freedom-track)"
          strokeWidth={18}
          strokeLinecap="round"
        />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#f2f0eb" strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill="#f2f0eb" />
        <circle cx={exitX} cy={exitY} r={4} fill="#2d9f6f" />
        <text x={exitX} y={exitY - 8} textAnchor="middle" fontSize={10} fill="#2d9f6f">
          1.0 exit
        </text>
      </svg>
      <div className="-mt-6 text-center">
        <div className="font-display text-4xl font-semibold text-foreground tabular-money">
          {clamped.toFixed(2)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          Freedom Ratio
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{ratioLabel}</div>
        {passiveIncome !== undefined && monthlyExpenses !== undefined && (
          <div className="text-xs text-muted-foreground mt-2">
            passive / expenses
          </div>
        )}
      </div>
    </div>
  );
}

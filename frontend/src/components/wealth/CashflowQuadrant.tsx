"use client";

// 2x2 CASHFLOW Quadrant: E (top-left), S (top-right), B (bottom-left), I (bottom-right).
// In Kiyosaki's frame the right side (B + I) is where leverage lives; we colour it accordingly.

import React from "react";
import type { QuadrantProfile } from "@/lib/wealth";

type Props = {
  profile: QuadrantProfile | null;
  size?: number;
};

export function CashflowQuadrant({ profile, size = 320 }: Props) {
  const pE = profile?.pct_e ?? 0;
  const pS = profile?.pct_s ?? 0;
  const pB = profile?.pct_b ?? 0;
  const pI = profile?.pct_i ?? 0;
  const tB = profile?.target_pct_b ?? 0;
  const tI = profile?.target_pct_i ?? 0;

  // Compute user dot position: x is right-side share (B+I), y is bottom share (B+I).
  // Actually Kiyosaki's quadrant: E top-left, S top-right, B bottom-left, I bottom-right.
  // We place the dot on the weighted centroid of the four cells.
  const cellCenters = {
    E: { x: 0.25, y: 0.25 },
    S: { x: 0.75, y: 0.25 },
    B: { x: 0.25, y: 0.75 },
    I: { x: 0.75, y: 0.75 },
  };
  const totalNow = Math.max(1, pE + pS + pB + pI);
  const user = {
    x: (cellCenters.E.x * pE + cellCenters.S.x * pS + cellCenters.B.x * pB + cellCenters.I.x * pI) / totalNow,
    y: (cellCenters.E.y * pE + cellCenters.S.y * pS + cellCenters.B.y * pB + cellCenters.I.y * pI) / totalNow,
  };

  // Target dot: weighted between B (if target_pct_b) and I (if target_pct_i). Fall back to I.
  const tSum = Math.max(1, tB + tI);
  const target = {
    x: (cellCenters.B.x * tB + cellCenters.I.x * tI) / tSum,
    y: (cellCenters.B.y * tB + cellCenters.I.y * tI) / tSum,
  };

  const pad = 16;
  const inner = size - pad * 2;

  const ariaLabel = `CASHFLOW quadrant. Employee ${pE.toFixed(0)} percent, Self-employed ${pS.toFixed(0)} percent, Business ${pB.toFixed(0)} percent, Investor ${pI.toFixed(0)} percent.`;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        tabIndex={0}
      >
        <g transform={`translate(${pad},${pad})`}>
          <rect x={0} y={0} width={inner / 2} height={inner / 2} fill="#18181b" stroke="#27272a" />
          <rect x={inner / 2} y={0} width={inner / 2} height={inner / 2} fill="#18181b" stroke="#27272a" />
          <rect x={0} y={inner / 2} width={inner / 2} height={inner / 2} fill="rgba(212,175,55,0.06)" stroke="#27272a" />
          <rect x={inner / 2} y={inner / 2} width={inner / 2} height={inner / 2} fill="rgba(34,197,94,0.08)" stroke="#27272a" />

          <QuadrantLabel x={inner * 0.25} y={inner * 0.25} letter="E" title="Employee" pct={pE} />
          <QuadrantLabel x={inner * 0.75} y={inner * 0.25} letter="S" title="Self-Employed" pct={pS} />
          <QuadrantLabel x={inner * 0.25} y={inner * 0.75} letter="B" title="Business Owner" pct={pB} accent />
          <QuadrantLabel x={inner * 0.75} y={inner * 0.75} letter="I" title="Investor" pct={pI} accent />

          <line
            x1={user.x * inner}
            y1={user.y * inner}
            x2={target.x * inner}
            y2={target.y * inner}
            stroke="#d4af37"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <circle cx={target.x * inner} cy={target.y * inner} r={9} fill="none" stroke="#22c55e" strokeWidth={2} />
          <text x={target.x * inner + 12} y={target.y * inner + 4} fontSize={11} fill="#22c55e">
            target
          </text>
          <circle cx={user.x * inner} cy={user.y * inner} r={9} fill="#d4af37" />
          <text x={user.x * inner + 12} y={user.y * inner + 4} fontSize={11} fill="#d4af37">
            you
          </text>
        </g>
      </svg>
      <p className="text-xs text-muted-foreground text-center max-w-sm mt-3">
        Based on principles from Rich Dad&apos;s Guide to Investing (cited reference): the right
        side (B + I) is where tax and time leverage often matter most. Your targets shift the dot
        toward that side.
      </p>
    </div>
  );
}

function QuadrantLabel({
  x,
  y,
  letter,
  title,
  pct,
  accent,
}: {
  x: number;
  y: number;
  letter: string;
  title: string;
  pct: number;
  accent?: boolean;
}) {
  const color = accent ? "#d4af37" : "#a1a1aa";
  return (
    <g>
      <text x={x} y={y - 8} textAnchor="middle" fontSize={36} fontWeight={700} fill={color}>
        {letter}
      </text>
      <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fill="#a1a1aa">
        {title}
      </text>
      <text x={x} y={y + 30} textAnchor="middle" fontSize={11} fill={color}>
        {Math.round(pct)}%
      </text>
    </g>
  );
}

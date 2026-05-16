"use client";

// Kiyosaki's B-I Triangle - 8 integrities of a strong business.
// Three outer layers (Mission, Leadership, Team) surround 5 inner bands
// (Product, Legal, Systems, Communications, Cash Flow).
//
// We render as a triangle diagram where each layer is coloured by its score
// (0..100). Click a layer to surface details.

import React from "react";
import type { BITriangleScore } from "@/lib/wealth";

type Props = {
  score: BITriangleScore | null;
  onSelect?: (key: keyof BITriangleScore | "overall") => void;
  selectedKey?: keyof BITriangleScore | "overall" | null;
};

const INNER_LAYERS: Array<{ key: keyof BITriangleScore; label: string }> = [
  { key: "product", label: "Product" },
  { key: "legal", label: "Legal" },
  { key: "systems", label: "Systems" },
  { key: "communications", label: "Communications" },
  { key: "cashflow", label: "Cash Flow" },
];

function colorFor(v: number): string {
  if (v >= 70) return "rgba(34,197,94,0.35)";
  if (v >= 40) return "rgba(234,179,8,0.35)";
  return "rgba(239,68,68,0.35)";
}

function strokeFor(v: number): string {
  if (v >= 70) return "#22c55e";
  if (v >= 40) return "#eab308";
  return "#ef4444";
}

export function BITriangle({ score, onSelect, selectedKey }: Props) {
  const s = score || {
    mission: 0,
    leadership: 0,
    team: 0,
    product: 0,
    legal: 0,
    systems: 0,
    communications: 0,
    cashflow: 0,
    overall: 0,
  };
  const size = 360;
  const cx = size / 2;
  const apex = { x: cx, y: 40 };
  const left = { x: 40, y: size - 40 };
  const right = { x: size - 40, y: size - 40 };

  // Each outer integrity is a whole-triangle border layer.
  const outerLayers: Array<{ key: keyof BITriangleScore; label: string; inset: number }> = [
    { key: "mission", label: "Mission", inset: 0 },
    { key: "leadership", label: "Leadership", inset: 14 },
    { key: "team", label: "Team", inset: 28 },
  ];

  function pathFor(inset: number): string {
    const shrink = (p: { x: number; y: number }, toward: { x: number; y: number }) => ({
      x: p.x + (toward.x - p.x) * (inset / 400),
      y: p.y + (toward.y - p.y) * (inset / 400),
    });
    const center = { x: cx, y: size / 2 };
    const a = shrink(apex, center);
    const l = shrink(left, center);
    const r = shrink(right, center);
    return `M ${a.x} ${a.y} L ${r.x} ${r.y} L ${l.x} ${l.y} Z`;
  }

  const biAria = `B-I Triangle diagram. Overall score ${(s.overall || 0).toFixed(0)}. Mission ${s.mission}, Leadership ${s.leadership}, Team ${s.team}. Inner bands: Product ${s.product}, Legal ${s.legal}, Systems ${s.systems}, Communications ${s.communications}, Cash flow ${s.cashflow}.`;

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        role="img"
        aria-label={biAria}
        tabIndex={0}
      >
        {outerLayers.map((layer, i) => {
          const v = (s[layer.key] as number) || 0;
          const isSelected = selectedKey === layer.key;
          return (
            <g key={layer.key} onClick={() => onSelect?.(layer.key)} style={{ cursor: "pointer" }}>
              <path
                d={pathFor(layer.inset)}
                fill={i === 0 ? "transparent" : colorFor(v)}
                stroke={strokeFor(v)}
                strokeWidth={isSelected ? 3 : 1.5}
              />
            </g>
          );
        })}
        {/* Inner 5-band region as horizontal stripes across the innermost triangle */}
        {INNER_LAYERS.map((band, i) => {
          const v = (s[band.key] as number) || 0;
          const bandHeight = (size - 80 - 56) / INNER_LAYERS.length;
          const yStart = 40 + 56 + i * bandHeight;
          const yEnd = yStart + bandHeight;
          // Simple stacked bars inside the triangle using trapezoid approximations
          const topFrac = (yStart - 40) / (size - 80);
          const botFrac = (yEnd - 40) / (size - 80);
          const topHalfWidth = topFrac * ((size - 80) / 2);
          const botHalfWidth = botFrac * ((size - 80) / 2);
          const isSelected = selectedKey === band.key;
          return (
            <g key={band.key} onClick={() => onSelect?.(band.key)} style={{ cursor: "pointer" }}>
              <path
                d={`M ${cx - topHalfWidth} ${yStart} L ${cx + topHalfWidth} ${yStart} L ${cx + botHalfWidth} ${yEnd} L ${cx - botHalfWidth} ${yEnd} Z`}
                fill={colorFor(v)}
                stroke={strokeFor(v)}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text x={cx} y={yStart + bandHeight / 2 + 4} textAnchor="middle" fontSize={11} fill="#f5f5f5">
                {band.label}: {v}
              </text>
            </g>
          );
        })}

        <text x={cx} y={apex.y - 8} textAnchor="middle" fontSize={11} fill="#a1a1aa">
          Mission: {s.mission}
        </text>
        <text x={left.x - 6} y={left.y + 14} textAnchor="start" fontSize={11} fill="#a1a1aa">
          Leadership: {s.leadership}
        </text>
        <text x={right.x + 6} y={right.y + 14} textAnchor="end" fontSize={11} fill="#a1a1aa">
          Team: {s.team}
        </text>
      </svg>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Overall B-I Triangle</div>
          <div className="text-3xl font-bold text-foreground mt-1">{(s.overall || 0).toFixed(0)}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Strong businesses have all 8 integrities intact. Improve the lowest
            one first; a weak band drags the whole triangle down.
          </p>
        </div>
      </div>
    </div>
  );
}

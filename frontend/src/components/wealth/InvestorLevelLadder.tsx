"use client";

// Kiyosaki's 7-level ladder (0..6). Render vertically with the current level
// highlighted and all levels clickable so users can explore definitions.

import React from "react";
import { INVESTOR_LEVELS } from "@/lib/wealth";

type Props = {
  currentLevel: number;
  onSelect?: (level: number) => void;
  selectedLevel?: number;
};

export function InvestorLevelLadder({ currentLevel, onSelect, selectedLevel }: Props) {
  return (
    <div className="space-y-2" role="list" aria-label="Investor levels zero through six">
      {[...INVESTOR_LEVELS].reverse().map((l) => {
        const isCurrent = l.level === currentLevel;
        const isSelected = selectedLevel === l.level;
        return (
          <button
            key={l.level}
            type="button"
            role="listitem"
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Level ${l.level}, ${l.name}`}
            onClick={() => onSelect?.(l.level)}
            className={`w-full text-left rounded-lg border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isCurrent
                ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                : isSelected
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : l.level <= currentLevel
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {l.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Level {l.level} - {l.name}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      you are here
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{l.blurb}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InvestorLevelLadder } from "@/components/wealth/InvestorLevelLadder";
import { INVESTOR_LEVELS, type InvestorLevel, wealthFetch } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

const LEVEL_DETAIL: Record<number, { title: string; symptoms: string[]; escape: string; cta: { label: string; href: string } }> = {
  0: {
    title: "Those with nothing to invest",
    symptoms: ["No savings, no assets", "Spend everything earned", "No written statement"],
    escape: "Start a personal financial statement and pay yourself first.",
    cta: { label: "Build statement", href: "/wealth/statement" },
  },
  1: {
    title: "Borrowers",
    symptoms: ["Bad debt > assets", "Consumer credit to buy doodads", "Robbing Peter to pay Paul"],
    escape: "Attack the highest-interest bad debt. Close credit lines after payoff.",
    cta: { label: "See liabilities", href: "/wealth/statement" },
  },
  2: {
    title: "Savers",
    symptoms: ["Cash in bank", "No cashflow assets", "Waits for inflation to hit"],
    escape: "Convert one month of savings into a cashflow asset you understand.",
    cta: { label: "Open deals", href: "/wealth/deals" },
  },
  3: {
    title: "Smart but passive",
    symptoms: ["Owns paper assets only", "Relies on a fund manager", "Diversified in one class"],
    escape: "Add a second asset class you actively control (real estate, business, IP).",
    cta: { label: "Shift the quadrant", href: "/wealth/quadrant" },
  },
  4: {
    title: "Long-term investors",
    symptoms: ["Written plan", "Multiple asset classes", "Patient; low emotional volatility"],
    escape: "Score every new deal against all 10 Investor Controls.",
    cta: { label: "Score a deal", href: "/wealth/deals" },
  },
  5: {
    title: "Sophisticated investors",
    symptoms: ["Designs deals", "Uses leverage and OPM", "Controls taxes legally"],
    escape: "Build a B-I Triangle for a business you want to buy or build.",
    cta: { label: "B-I Triangle", href: "/wealth/business" },
  },
  6: {
    title: "Capitalists",
    symptoms: ["Freedom Ratio >= 1.0", "Time free and money free", "Gives back generously"],
    escape: "Codify your philanthropy plan and mentor the next investor.",
    cta: { label: "Phase 5 plan", href: "/wealth/path" },
  },
};

export default function WealthLevelsPage() {
  const [level, setLevel] = useState<InvestorLevel | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await wealthFetch<InvestorLevel>("wealth/level/");
      if (res) {
        setLevel(res);
        setSelected(res.current_level);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !level) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-2/3 col-span-full" />
        <div className="h-[420px] bg-muted/40 rounded-xl border border-border" />
        <div className="h-[420px] bg-muted/40 rounded-xl border border-border" />
      </div>
    );
  }

  const detail = LEVEL_DETAIL[selected] || LEVEL_DETAIL[0];
  const staticMeta = INVESTOR_LEVELS.find((l) => l.level === selected);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            The 7 Investor Levels
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Framework from Rich Dad&apos;s Guide to Investing (cited reference): Level 0 through
            Level 6. Your level updates from your statement and line items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the 7 Investor Levels ladder and what level I am on." />
          <AskCoachLink title="Investor Levels" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ladder</CardTitle>
            <CardDescription className="text-xs">Click a level to inspect it.</CardDescription>
          </CardHeader>
          <CardContent>
            <InvestorLevelLadder
              currentLevel={level.current_level}
              selectedLevel={selected}
              onSelect={(l) => setSelected(l)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Level {selected} - {staticMeta?.name}
            </CardTitle>
            <CardDescription className="text-xs">{detail.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Symptoms</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {detail.symptoms.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Escape</div>
              <p className="text-sm">{detail.escape}</p>
            </div>
            <Link
              href={detail.cta.href}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {detail.cta.label} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {level.level_history && level.level_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your level history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {level.level_history.slice(-10).reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <div className="font-semibold">Level {h.level}{h.sublevel ? ` - ${h.sublevel}` : ""}</div>
                    <div className="text-[11px] text-muted-foreground">{h.reason}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.changed_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FreedomRatioGauge } from "@/components/wealth/FreedomRatioGauge";
import { FinancialStatementDiagram } from "@/components/wealth/FinancialStatementDiagram";
import {
  INVESTOR_LEVELS,
  PHASES,
  formatNaira,
  wealthFetch,
  CITATION_DISCLOSURE,
} from "@/lib/wealth";
import type { WealthCockpit, NextAction } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

function CockpitSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded-md w-2/3 max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 h-64 bg-muted/30 rounded-xl" />
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 h-64 bg-muted/30 rounded-xl" />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 h-40 bg-muted/30 rounded-xl" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function WealthCockpitPage() {
  const [data, setData] = useState<WealthCockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await wealthFetch<WealthCockpit>("wealth/cockpit/");
      if (cancelled) return;
      if (!res) setError("Could not load your wealth cockpit. Please try again.");
      else setData(res);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <CockpitSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{error || "No data yet."}</p>
        <p className="text-xs text-muted-foreground mt-2">
          The cockpit tracks passive income vs expenses (Freedom Ratio) so you can see progress
          toward financial independence.
        </p>
        <Link
          href="/onboard"
          className="text-primary inline-flex items-center gap-1 mt-3 text-sm hover:underline"
        >
          Complete Wealth Discovery <ArrowRight className="h-3 w-3" />
        </Link>
        <div className="mt-4">
          <Link href="/wealth/chat">
            <Button size="sm" variant="outline">
              Open the coach
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { snapshot, phase, investor_level: level, next_action, cockpit_trend } = data;
  const levelMeta = INVESTOR_LEVELS.find((l) => l.level === level.current_level);
  const phaseMeta = PHASES.find((p) => p.id === (phase.current_phase as 1 | 2 | 3 | 4 | 5));

  const delta = cockpit_trend?.freedom_ratio_delta;
  const hasTrend = typeof delta === "number" && !Number.isNaN(delta);

  return (
    <div className="space-y-6">
      {hasTrend && (
        <div
          className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <span className="font-medium">This month: </span>
          Freedom Ratio {delta >= 0 ? "up" : "down"}{" "}
          {Math.abs(delta).toFixed(3)} vs prior snapshot
          {cockpit_trend?.prior_period_month
            ? ` (${cockpit_trend.prior_period_month}).`
            : "."}{" "}
          Based on principles from Rich Dad&apos;s Guide to Investing by Robert Kiyosaki (cited reference).
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Wealth Cockpit</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            See where you stand: passive income vs expenses, level, phase, and your next action.
            Frameworks are cited as educational references — {CITATION_DISCLOSURE.slice(0, 72)}…
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the Wealth Cockpit page and what Freedom Ratio means for me." />
          <AskCoachLink title="Wealth Cockpit" />
          <Link href="/wealth/statement">
            <Button variant="outline" size="sm">
              Open full statement
            </Button>
          </Link>
          <Link href="/wealth/chat">
            <Button size="sm">Coach chat</Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Freedom Ratio</CardTitle>
            <CardDescription className="text-xs">
              Passive income divided by monthly expenses. 1.0 means passive income covers expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center lg:items-stretch">
            <div className="w-full flex justify-center">
              <FreedomRatioGauge
                ratio={snapshot.freedom_ratio}
                passiveIncome={snapshot.passive_income}
                monthlyExpenses={snapshot.total_expenses}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-center w-full">
              <div className="rounded-md border border-border bg-background/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Passive</div>
                <div className="text-sm font-semibold tabular-nums">{formatNaira(snapshot.passive_income)}</div>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</div>
                <div className="text-sm font-semibold tabular-nums">{formatNaira(snapshot.total_expenses)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Mini statement</CardTitle>
              <CardDescription className="text-xs hidden lg:block">
                Your personal financial statement summary for this month (educational framework).
              </CardDescription>
            </div>
            <Link href="/wealth/statement" className="text-xs text-primary hover:underline shrink-0">
              View full
            </Link>
          </CardHeader>
          <CardContent>
            <div className="hidden lg:block">
              <FinancialStatementDiagram snapshot={snapshot} />
            </div>
            <details className="lg:hidden rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                This month at a glance
              </summary>
              <div className="p-3 border-t border-border">
                <FinancialStatementDiagram snapshot={snapshot} />
              </div>
            </details>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LevelBadge level={level.current_level} label={levelMeta?.name} blurb={levelMeta?.blurb} />
        <PhaseCard phase={phase.current_phase} label={phaseMeta?.title} blurb={phaseMeta?.blurb} />
        <NextActionCard action={next_action} />
      </div>
    </div>
  );
}

function LevelBadge({ level, label, blurb }: { level: number; label?: string; blurb?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Investor Level</CardTitle>
        <CardDescription className="text-xs">Seven-rung ladder (0–6), cited reference framework</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold border-2 border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            role="img"
            aria-label={`Investor level ${level}`}
            tabIndex={0}
          >
            {level}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{label || "Unassessed"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{blurb}</div>
          </div>
        </div>
        <Link href="/wealth/levels" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3">
          See full ladder <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function PhaseCard({ phase, label, blurb }: { phase: number; label?: string; blurb?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current Phase</CardTitle>
        <CardDescription className="text-xs">Five-phase investor plan (cited reference)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3" role="list" aria-label="Phase progress">
          {[1, 2, 3, 4, 5].map((p) => (
            <div
              key={p}
              role="listitem"
              aria-label={`Phase ${p} ${p <= (phase || 0) ? "reached" : "not reached"}`}
              className={`h-2 flex-1 rounded-full ${
                p <= (phase || 0) ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="text-sm font-semibold">Phase {phase} - {label}</div>
        <div className="text-xs text-muted-foreground mt-1">{blurb}</div>
        <Link href="/wealth/path" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3">
          Open the path <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function NextActionCard({ action }: { action: NextAction | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Next Action</CardTitle>
        <CardDescription className="text-xs">One concrete step your coach recommends.</CardDescription>
      </CardHeader>
      <CardContent>
        {action ? (
          <>
            <div className="text-sm font-semibold text-foreground">{action.title}</div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-4">
              {action.body}
            </p>
            <Link href={action.cta_route || "/wealth/chat"}>
              <Button size="sm" className="mt-3 w-full">
                Work on it
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-400" aria-hidden />
            <p className="text-sm text-center">
              No open next action. Open the coach for a fresh step or add data on your statement.
            </p>
            <Link href="/wealth/chat" className="mt-3">
              <Button size="sm" variant="outline">
                Ask the coach
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

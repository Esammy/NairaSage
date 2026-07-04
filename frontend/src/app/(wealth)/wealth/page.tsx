"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FreedomRatioGauge } from "@/components/wealth/FreedomRatioGauge";
import { FinancialStatementDiagram } from "@/components/wealth/FinancialStatementDiagram";
import { CockpitMoreMenu } from "@/components/wealth/CockpitMoreMenu";
import { INVESTOR_LEVELS, PHASES, formatNaira, wealthFetch } from "@/lib/wealth";
import type { WealthCockpit, NextAction } from "@/lib/wealth";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";
import { openWealthCoach } from "@/lib/wealth-coach";

function CockpitSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-muted rounded-xl w-full" />
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

function formatPeriodMonth(periodMonth: string) {
  const [y, m] = periodMonth.split("-").map(Number);
  if (!y || !m) return periodMonth;
  return new Date(y, m - 1, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
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
  const snapshotLabel =
    data.period_month
      ? formatPeriodMonth(data.period_month)
      : snapshot.period_month
        ? formatPeriodMonth(snapshot.period_month)
        : null;
  const completenessPct =
    typeof data.data_completeness === "number"
      ? Math.round(data.data_completeness * 100)
      : null;

  const coachPrompt = next_action
    ? `Help me with my next action: ${next_action.title}. ${next_action.body}`
    : "What should I focus on this week based on my wealth cockpit?";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Wealth Cockpit</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Passive income vs expenses, your level, phase, and one clear next step.
          </p>
          {snapshotLabel ? (
            <p className="text-xs text-muted-foreground mt-1">Snapshot as of {snapshotLabel}</p>
          ) : null}
          {completenessPct !== null ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Statement {completenessPct}% complete — add missing figures for sharper coach guidance.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <AskCoachLink title="my next action" className="shrink-0" />
          <CockpitMoreMenu />
        </div>
      </header>

      {hasTrend && (
        <div
          className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <span className="font-medium">This month: </span>
          Freedom Ratio {delta >= 0 ? "up" : "down"} {Math.abs(delta).toFixed(3)} vs prior snapshot
          {cockpit_trend?.prior_period_month ? ` (${cockpit_trend.prior_period_month}).` : "."}
        </div>
      )}

      <NextActionCard action={next_action} coachPrompt={coachPrompt} prominent />

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
                <div className="text-sm font-semibold tabular-nums">
                  {formatNaira(snapshot.passive_income)}
                </div>
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
                Your personal financial statement summary for this month.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LevelBadge level={level.current_level} label={levelMeta?.name} blurb={levelMeta?.blurb} />
        <PhaseCard phase={phase.current_phase} label={phaseMeta?.title} blurb={phaseMeta?.blurb} />
      </div>
    </div>
  );
}

function LevelBadge({ level, label, blurb }: { level: number; label?: string; blurb?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Investor Level</CardTitle>
        <CardDescription className="text-xs">Seven-rung ladder (0–6)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold border-2 border-primary"
            role="img"
            aria-label={`Investor level ${level}`}
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
        <CardDescription className="text-xs">Five-phase investor plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3" role="list" aria-label="Phase progress">
          {[1, 2, 3, 4, 5].map((p) => (
            <div
              key={p}
              role="listitem"
              aria-label={`Phase ${p} ${p <= (phase || 0) ? "reached" : "not reached"}`}
              className={`h-2 flex-1 rounded-full ${p <= (phase || 0) ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="text-sm font-semibold">
          Phase {phase} - {label}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{blurb}</div>
        <Link href="/wealth/path" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3">
          Open the path <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function NextActionCard({
  action,
  coachPrompt,
  prominent = false,
}: {
  action: NextAction | null;
  coachPrompt: string;
  prominent?: boolean;
}) {
  const shell = prominent
    ? "border-2 border-primary/40 bg-primary/5 shadow-lg shadow-gold-500/10"
    : "";

  return (
    <Card className={shell}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Your next action</CardTitle>
        <CardDescription className="text-xs">One concrete step — start here.</CardDescription>
      </CardHeader>
      <CardContent>
        {action ? (
          <>
            <div className="text-base font-semibold text-foreground">{action.title}</div>
            <p className="text-sm text-muted-foreground mt-2">{action.body}</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link href={action.cta_route || "/wealth/chat"} className="flex-1">
                <Button className="w-full">
                  Work on it
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => openWealthCoach(coachPrompt)}
              >
                Ask coach about this
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No open next action. Ask the coach for a fresh step or update your statement.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => openWealthCoach(coachPrompt)}>
              Ask the coach
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

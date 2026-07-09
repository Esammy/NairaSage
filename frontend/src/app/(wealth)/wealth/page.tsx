"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-muted rounded-md w-48" />
      <div className="h-28 bg-muted rounded-xl w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 h-72 bg-muted/40 rounded-xl" />
        <div className="lg:col-span-3 h-72 bg-muted/40 rounded-xl" />
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
      <div className="rounded-xl border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground">{error || "No data yet."}</p>
        <p className="text-xs text-muted-foreground mt-2">
          The cockpit tracks passive income vs expenses (Freedom Ratio) so you can see progress
          toward financial independence.
        </p>
        <Link
          href="/onboard"
          className="text-primary inline-flex items-center gap-1 mt-4 text-sm hover:underline"
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
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Wealth Cockpit
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {snapshotLabel ? <span>As of {snapshotLabel}</span> : null}
            {completenessPct !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-12 rounded-full bg-muted overflow-hidden" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${completenessPct}%` }}
                  />
                </span>
                Statement {completenessPct}% complete
              </span>
            ) : null}
            {hasTrend ? (
              <span role="status">
                Freedom Ratio {delta >= 0 ? "up" : "down"} {Math.abs(delta).toFixed(3)}
                {cockpit_trend?.prior_period_month
                  ? ` vs ${cockpit_trend.prior_period_month}`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AskCoachLink title="my next action" className="shrink-0" />
          <CockpitMoreMenu />
        </div>
      </header>

      {/* Hero: next action */}
      <NextActionBand action={next_action} coachPrompt={coachPrompt} />

      {/* Visual anchor: Freedom Ratio + mini statement */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-medium text-foreground">Freedom Ratio</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Passive income ÷ monthly expenses. 1.0 means expenses are covered.
          </p>
          <div className="flex justify-center">
            <FreedomRatioGauge
              ratio={snapshot.freedom_ratio}
              passiveIncome={snapshot.passive_income}
              monthlyExpenses={snapshot.total_expenses}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="rounded-md border border-border/70 bg-background/40 px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Passive</div>
              <div className="text-sm font-semibold tabular-money mt-0.5">
                {formatNaira(snapshot.passive_income)}
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/40 px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</div>
              <div className="text-sm font-semibold tabular-money mt-0.5">
                {formatNaira(snapshot.total_expenses)}
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-base font-medium text-foreground">Mini statement</h2>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                This month&apos;s income, expenses, assets, and liabilities.
              </p>
            </div>
            <Link
              href="/wealth/statement"
              className="text-xs text-primary hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              View full
            </Link>
          </div>
          <div className="hidden lg:block">
            <FinancialStatementDiagram snapshot={snapshot} />
          </div>
          <details className="lg:hidden rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
              This month at a glance
            </summary>
            <div className="p-3 border-t border-border">
              <FinancialStatementDiagram snapshot={snapshot} />
            </div>
          </details>
        </section>
      </div>

      {/* Secondary: level + phase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LevelBadge level={level.current_level} label={levelMeta?.name} blurb={levelMeta?.blurb} />
        <PhaseCard phase={phase.current_phase} label={phaseMeta?.title} blurb={phaseMeta?.blurb} />
      </div>
    </div>
  );
}

function NextActionBand({
  action,
  coachPrompt,
}: {
  action: NextAction | null;
  coachPrompt: string;
}) {
  return (
    <section className="rounded-xl border border-primary/30 bg-primary/[0.06] px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-semibold">
        Your next action
      </p>
      {action ? (
        <>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground mt-2 tracking-tight">
            {action.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">{action.body}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md">
            <Link href={action.cta_route || "/wealth/chat"} className="flex-1">
              <Button className="w-full h-10 rounded-md font-semibold">
                Work on it
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-md"
              onClick={() => openWealthCoach(coachPrompt)}
            >
              Ask coach about this
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-muted-foreground leading-relaxed">
              No open next action. Ask the coach for a fresh step or update your statement.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shrink-0"
            onClick={() => openWealthCoach(coachPrompt)}
          >
            Ask the coach
          </Button>
        </div>
      )}
    </section>
  );
}

function LevelBadge({ level, label, blurb }: { level: number; label?: string; blurb?: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Investor Level
      </p>
      <div className="flex items-center gap-4 mt-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-display font-semibold border border-primary/40"
          role="img"
          aria-label={`Investor level ${level}`}
        >
          {level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{label || "Unassessed"}</div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{blurb}</div>
        </div>
      </div>
      <Link
        href="/wealth/levels"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        See full ladder <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

function PhaseCard({ phase, label, blurb }: { phase: number; label?: string; blurb?: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Current Phase
      </p>
      <div className="flex items-center gap-1.5 mt-3 mb-3" role="list" aria-label="Phase progress">
        {[1, 2, 3, 4, 5].map((p) => (
          <div
            key={p}
            role="listitem"
            aria-label={`Phase ${p} ${p <= (phase || 0) ? "reached" : "not reached"}`}
            className={`h-1.5 flex-1 rounded-full ${p <= (phase || 0) ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="text-sm font-semibold">
        Phase {phase}
        {label ? ` — ${label}` : ""}
      </div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{blurb}</div>
      <Link
        href="/wealth/path"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Open the path <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

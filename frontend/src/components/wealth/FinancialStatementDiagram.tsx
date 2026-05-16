"use client";

// The iconic Kiyosaki Personal Financial Statement visual.
//
// Four quadrants:
//   top-left:  Income column
//   top-right: Expense column
//   bottom-left: Asset column
//   bottom-right: Liability column
//
// Animated arrows show money flow:
//   assets     -> income    (assets put money IN)
//   income     -> expenses  (paycheck-to-paycheck)
//   expenses   -> liabilities (doodads leak to bad debt)
//   liabilities -> expenses  (interest creates more expense)

import React from "react";
import { motion } from "framer-motion";
import type { FinancialStatementSnapshot } from "@/lib/wealth";
import { formatNaira } from "@/lib/wealth";

type Props = {
  snapshot: FinancialStatementSnapshot | null;
  onEdit?: () => void;
};

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : 0;
}

export function FinancialStatementDiagram({ snapshot, onEdit }: Props) {
  const incomeActive = num(snapshot?.income_active);
  const incomePassive = num(snapshot?.income_passive);
  const incomePortfolio = num(snapshot?.income_portfolio);
  const incomeTotal = incomeActive + incomePassive + incomePortfolio;

  const expensesEssential = num(snapshot?.expenses_essential);
  const expensesDoodad = num(snapshot?.expenses_doodad);
  const expensesTotal = expensesEssential + expensesDoodad;

  const assetsCashflow = num(snapshot?.assets_cashflow);
  const assetsAppreciation = num(snapshot?.assets_appreciation);
  const assetsTotal = assetsCashflow + assetsAppreciation;

  const liabilitiesGood = num(snapshot?.liabilities_good);
  const liabilitiesBad = num(snapshot?.liabilities_bad);
  const liabilitiesTotal = liabilitiesGood + liabilitiesBad;

  const netWorth = assetsTotal - liabilitiesTotal;
  const freedomRatio = snapshot?.freedom_ratio ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Column
        title="Income"
        color="text-emerald-400"
        items={[
          { label: "Active (salary, wages)", value: incomeActive, muted: true },
          { label: "Passive (rent, royalties)", value: incomePassive },
          { label: "Portfolio (dividends, interest)", value: incomePortfolio },
        ]}
        total={incomeTotal}
        corner="income"
        badge={
          <span className="text-[10px] uppercase tracking-wide text-emerald-500">
            The Statement of Income
          </span>
        }
      />
      <Column
        title="Expense"
        color="text-rose-400"
        items={[
          { label: "Essential", value: expensesEssential },
          { label: "Doodads (Kiyosaki)", value: expensesDoodad, muted: true, warn: true },
        ]}
        total={expensesTotal}
        corner="expense"
      />
      <Column
        title="Asset"
        color="text-emerald-400"
        items={[
          { label: "Cashflow-producing (good)", value: assetsCashflow },
          { label: "Appreciation-only", value: assetsAppreciation, muted: true },
        ]}
        total={assetsTotal}
        corner="asset"
        badge={
          <span className="text-[10px] uppercase tracking-wide text-emerald-500">
            The Balance Sheet
          </span>
        }
      />
      <Column
        title="Liability"
        color="text-rose-400"
        items={[
          { label: "Good debt (bought an asset)", value: liabilitiesGood },
          { label: "Bad debt (bought a doodad)", value: liabilitiesBad, warn: true },
        ]}
        total={liabilitiesTotal}
        corner="liability"
      />

      <div className="md:col-span-2 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border p-4 bg-card/50">
        <div className="flex items-center gap-6 flex-wrap">
          <Metric label="Net worth" value={formatNaira(netWorth)} tone={netWorth >= 0 ? "ok" : "bad"} />
          <Metric label="Freedom Ratio" value={freedomRatio.toFixed(2)} tone={freedomRatio >= 1 ? "ok" : "neutral"} />
          <Metric
            label="Surplus / deficit"
            value={formatNaira(incomeTotal - expensesTotal)}
            tone={incomeTotal - expensesTotal >= 0 ? "ok" : "bad"}
          />
          <Metric label="Passive coverage" value={formatNaira(incomePassive + incomePortfolio)} tone="neutral" />
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            Edit this month
          </button>
        )}
      </div>

      <CashflowArrows
        assetsCashflow={assetsCashflow}
        incomePassive={incomePassive + incomePortfolio}
        expensesTotal={expensesTotal}
        liabilitiesBad={liabilitiesBad}
      />
    </div>
  );
}

function Column({
  title,
  color,
  items,
  total,
  corner,
  badge,
}: {
  title: string;
  color: string;
  items: Array<{ label: string; value: number; muted?: boolean; warn?: boolean }>;
  total: number;
  corner: "income" | "expense" | "asset" | "liability";
  badge?: React.ReactNode;
}) {
  const cornerStyles: Record<typeof corner, string> = {
    income: "rounded-tl-xl",
    expense: "rounded-tr-xl",
    asset: "rounded-bl-xl",
    liability: "rounded-br-xl",
  } as const;

  return (
    <div className={`bg-card border border-border ${cornerStyles[corner]} p-4 min-h-[180px]`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${color}`}>{title}</h4>
        {badge}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <span className={`${it.warn ? "text-rose-400" : it.muted ? "text-muted-foreground" : "text-foreground"}`}>
              {it.label}
            </span>
            <span className={`tabular-nums ${it.warn ? "text-rose-400" : "text-foreground"}`}>
              {formatNaira(it.value)}
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatNaira(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "bad" | "neutral" }) {
  const color =
    tone === "ok" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-foreground";
  return (
    <div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function CashflowArrows({
  assetsCashflow,
  incomePassive,
  expensesTotal,
  liabilitiesBad,
}: {
  assetsCashflow: number;
  incomePassive: number;
  expensesTotal: number;
  liabilitiesBad: number;
}) {
  // Only render the arrows row when there is visible flow - otherwise we
  // keep the statement compact.
  if (assetsCashflow + liabilitiesBad + incomePassive + expensesTotal === 0) return null;
  return (
    <div className="md:col-span-2 text-xs text-muted-foreground flex flex-wrap items-center gap-4 px-1 pt-1">
      <FlowHint
        from="Asset"
        to="Income"
        strength={incomePassive > 0 ? "strong" : "weak"}
        ok
        note={incomePassive > 0 ? "Your assets feed your income column" : "Build cashflow assets first"}
      />
      <FlowHint
        from="Income"
        to="Expenses"
        strength="strong"
        ok={false}
        note="Paycheck-to-paycheck while expenses eat income"
      />
      <FlowHint
        from="Expenses"
        to="Liabilities"
        strength={liabilitiesBad > 0 ? "strong" : "weak"}
        ok={false}
        note="Doodads create bad debt"
      />
      <FlowHint
        from="Liabilities"
        to="Expenses"
        strength={liabilitiesBad > 0 ? "strong" : "weak"}
        ok={false}
        note="Interest is a recurring expense"
      />
    </div>
  );
}

function FlowHint({
  from,
  to,
  strength,
  ok,
  note,
}: {
  from: string;
  to: string;
  strength: "strong" | "weak";
  ok: boolean;
  note: string;
}) {
  const color = ok ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: strength === "strong" ? 1.6 : 3 }}
        className={`inline-flex items-center gap-1 ${color}`}
      >
        <span>{from}</span>
        <span>→</span>
        <span>{to}</span>
      </motion.div>
      <span className="text-muted-foreground">{note}</span>
    </div>
  );
}

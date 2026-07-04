"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Deal, InvestorControls } from "@/lib/wealth";
import { formatNaira, wealthFetch } from "@/lib/wealth";
import { DealDeepAnalysis, type DeepAnalysisScores } from "@/components/wealth/DealDeepAnalysis";

const CONTROLS: Array<{ key: keyof InvestorControls; n: number; title: string; blurb: string }> = [
  { key: "control_1_self", n: 1, title: "Control over yourself", blurb: "Education, emotions, patience. The first and biggest control." },
  { key: "control_2_ratios", n: 2, title: "Control over Income / Expense / Asset / Liability ratios", blurb: "Does the deal improve the statement?" },
  { key: "control_3_management", n: 3, title: "Control over management", blurb: "Can you influence or replace the operators?" },
  { key: "control_4_taxes", n: 4, title: "Control over taxes", blurb: "Is the entity and holding period tax-efficient?" },
  { key: "control_5_entry_exit", n: 5, title: "Control over when you buy and sell", blurb: "Clear entry price, exit plan, and triggers." },
  { key: "control_6_brokerage", n: 6, title: "Control over brokerage transactions", blurb: "Quality of your broker/advisor. Fees and alignment." },
  { key: "control_7_etc_opm", n: 7, title: "ETC + OPM", blurb: "Entity, Timing, Character of income + Other People's Money usage." },
  { key: "control_8_terms", n: 8, title: "Control over terms and conditions", blurb: "Can you negotiate? Have you read the docs?" },
  { key: "control_9_info_access", n: 9, title: "Control over access to information", blurb: "Do you get what insiders get?" },
  { key: "control_10_philanthropy", n: 10, title: "Control over giving it back", blurb: "How will this deal fund your philanthropy?" },
];

const RATING_LABEL = ["Not considered", "Weak / risky", "Adequate", "Strong"];

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [controls, setControls] = useState<InvestorControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [d, c] = await Promise.all([
        wealthFetch<Deal>(`wealth/deals/${id}/`),
        wealthFetch<InvestorControls>(`wealth/deals/${id}/controls/`),
      ]);
      setDeal(d || null);
      setControls(c || null);
      setLoading(false);
    })();
  }, [id]);

  const setControl = (k: keyof InvestorControls, v: number) => {
    if (!controls) return;
    const clamped = Math.max(0, Math.min(3, v));
    setControls({ ...controls, [k]: clamped });
  };

  const applyAiScores = (ai: DeepAnalysisScores) => {
    if (!controls) return;
    const next = { ...controls };
    for (const c of CONTROLS) {
      const v = ai.scores[c.key];
      if (typeof v === "number") {
        (next as Record<string, unknown>)[c.key as string] = Math.max(0, Math.min(3, v));
      }
    }
    setControls(next);
  };

  const save = async () => {
    if (!controls) return;
    setSaving(true);
    const payload: Partial<InvestorControls> = {};
    for (const c of CONTROLS) {
      (payload as Record<string, number>)[c.key as string] = controls[c.key] as number;
    }
    const res = await wealthFetch<InvestorControls>(`wealth/deals/${id}/controls/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (res) setControls(res);
    setSaving(false);
  };

  if (loading || !deal) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading deal...
      </div>
    );
  }

  const total = controls
    ? CONTROLS.reduce((s, c) => s + ((controls[c.key] as number) || 0), 0)
    : 0;
  const pct = Math.round((total / 30) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/wealth/deals" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to deals
        </Link>
      </div>
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{deal.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{deal.deal_type.replace("_", " ")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Entry price" value={formatNaira(deal.entry_price)} />
        <Stat label="Projected monthly cashflow" value={formatNaira(deal.projected_monthly_cashflow)} tone="ok" />
        <Stat label="10 Controls" value={`${total} / 30 (${pct}%)`} tone={pct >= 67 ? "ok" : pct >= 34 ? "neutral" : "bad"} />
      </div>

      <DealDeepAnalysis dealId={id} onApplyScores={applyAiScores} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Score the 10 Investor Controls</CardTitle>
            <CardDescription className="text-xs">
              0 = not considered, 1 = weak, 2 = adequate, 3 = strong. The weakest
              control is the real risk.
            </CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1">Save</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {CONTROLS.map((c) => {
            const v = (controls?.[c.key] as number) || 0;
            return (
              <div key={c.key as string} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {c.n}. {c.title}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.blurb}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 min-w-[72px] text-right">
                    {RATING_LABEL[v]}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setControl(c.key, n)}
                      className={`flex-1 rounded-md px-2 py-1 text-sm font-semibold border ${
                        v === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" | "neutral" }) {
  const color =
    tone === "ok" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-1 ${color}`}>{value}</div>
    </div>
  );
}

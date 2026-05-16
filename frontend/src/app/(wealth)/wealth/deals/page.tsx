"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Deal, InvestorLevel } from "@/lib/wealth";
import { formatNaira, wealthFetch } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

type ListResponse<T> = { results: T[] } | T[];
function unwrap<T>(x: ListResponse<T> | null): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return x.results || [];
}

const ACCREDITED_LEVEL = 4;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [level, setLevel] = useState<InvestorLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    deal_type: "real_estate" as Deal["deal_type"],
    entry_price: "",
    projected_monthly_cashflow: "",
  });

  const load = async () => {
    setLoading(true);
    const [d, lv] = await Promise.all([
      wealthFetch<ListResponse<Deal>>("wealth/deals/"),
      wealthFetch<InvestorLevel>("wealth/level/"),
    ]);
    setDeals(unwrap(d));
    setLevel(lv || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!draft.title) return;
    setCreating(true);
    const created = await wealthFetch<Deal>("wealth/deals/", {
      method: "POST",
      body: JSON.stringify({
        title: draft.title,
        deal_type: draft.deal_type,
        status: "evaluating",
        entry_price: draft.entry_price || "0",
        projected_monthly_cashflow: draft.projected_monthly_cashflow || "0",
      }),
    });
    if (created) {
      setDeals((prev) => [created, ...prev]);
      setDraft({ title: "", deal_type: "real_estate", entry_price: "", projected_monthly_cashflow: "" });
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-1/3" />
        <div className="h-40 bg-muted/40 rounded-xl border border-border" />
        <div className="h-64 bg-muted/40 rounded-xl border border-border" />
      </div>
    );
  }

  const currentLevel = level?.current_level ?? 0;
  const accredited = currentLevel >= ACCREDITED_LEVEL;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Deals
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Score each opportunity against the 10 Investor Controls (cited reference framework). The
            weakest control is often the real risk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the Deals page and how to use the 10 Investor Controls checklist." />
          <AskCoachLink title="Deals and Investor Controls" />
        </div>
      </header>

      {!accredited && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <div>
              <CardTitle className="text-base">Accreditation gate (Level {ACCREDITED_LEVEL}+)</CardTitle>
              <CardDescription className="text-xs">
                You are at Level {currentLevel}. We suggest treating live commitments carefully below
                Level {ACCREDITED_LEVEL}+. You can still draft and score deals here to
                practice; real commitments should wait until you have exercised
                the 10 Controls repeatedly.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a deal</CardTitle>
          <CardDescription className="text-xs">
            Start with a simple sketch; open the deal to score the 10 Controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input
            className="md:col-span-2"
            placeholder="Deal title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <select
            className="rounded-md bg-background border border-border px-2 py-2 text-sm"
            value={draft.deal_type}
            onChange={(e) => setDraft({ ...draft, deal_type: e.target.value as Deal["deal_type"] })}
          >
            <option value="real_estate">Real estate</option>
            <option value="business">Business</option>
            <option value="paper">Paper asset</option>
            <option value="commodity">Commodity</option>
            <option value="ip">IP</option>
            <option value="other">Other</option>
          </select>
          <Input
            type="number"
            placeholder="Entry price"
            value={draft.entry_price}
            onChange={(e) => setDraft({ ...draft, entry_price: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Monthly cashflow"
            value={draft.projected_monthly_cashflow}
            onChange={(e) => setDraft({ ...draft, projected_monthly_cashflow: e.target.value })}
          />
          <div className="md:col-span-5 flex justify-end">
            <Button size="sm" onClick={create} disabled={creating || !draft.title}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">Add deal</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deals.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You haven&apos;t scored a deal yet. Add one above or open the coach for a practice
              scenario.
            </CardContent>
          </Card>
        )}
        {deals.map((d) => {
          const pct = d.controls?.pct ?? 0;
          const total = d.controls?.total ?? 0;
          return (
            <Card key={d.id} className="hover:border-primary/60 transition">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {d.deal_type.replace("_", " ")}
                  </CardDescription>
                </div>
                <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Entry</div>
                    <div className="tabular-nums">{formatNaira(d.entry_price)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly cashflow</div>
                    <div className="tabular-nums text-emerald-400">{formatNaira(d.projected_monthly_cashflow)}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>10 Investor Controls</span>
                    <span>{total} / 30 ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link href={`/wealth/deals/${d.id}`}>
                    <Button size="sm" variant="outline">Score the 10 Controls</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

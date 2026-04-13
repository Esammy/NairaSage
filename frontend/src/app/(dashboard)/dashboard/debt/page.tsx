"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Scale, ArrowDownWideNarrow, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { unwrapResults } from "@/lib/django-api";

type Debt = {
  id: number;
  name: string;
  debt_type: string;
  lender: string;
  original_amount: string;
  outstanding: string;
  interest_rate_pct: string;
  monthly_payment: string;
  due_date: string | null;
};

type SortMode = "avalanche" | "snowball";

const DEBT_LABELS: Record<string, string> = {
  personal_loan: "Personal Loan",
  mortgage: "Mortgage",
  credit_card: "Credit Card",
  auto_loan: "Auto Loan",
  student_loan: "Student Loan",
  bnpl: "BNPL / Informal",
  other: "Other",
};

export default function DebtPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("avalanche");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/django/debt", { credentials: "include" });
        if (!res.ok) {
          setDebts([]);
          return;
        }
        const body = await res.json();
        setDebts(unwrapResults<Debt>(body));
      } catch {
        setDebts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...debts];
    if (sort === "avalanche") {
      copy.sort((a, b) => parseFloat(b.interest_rate_pct) - parseFloat(a.interest_rate_pct));
    } else {
      copy.sort((a, b) => parseFloat(a.outstanding) - parseFloat(b.outstanding));
    }
    return copy;
  }, [debts, sort]);

  const totals = useMemo(() => {
    const outstanding = debts.reduce((s, d) => s + parseFloat(d.outstanding || "0"), 0);
    const monthly = debts.reduce((s, d) => s + parseFloat(d.monthly_payment || "0"), 0);
    let wNum = 0;
    let wDen = 0;
    for (const d of debts) {
      const o = parseFloat(d.outstanding || "0");
      const r = parseFloat(d.interest_rate_pct || "0");
      wNum += o * r;
      wDen += o;
    }
    const weightedApr = wDen > 0 ? wNum / wDen : 0;
    return { outstanding, monthly, weightedApr };
  }, [debts]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="w-8 h-8 text-primary" /> Debt manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Outstanding balances and monthly service. Use avalanche (highest APR first) or snowball (smallest
            balance first) ordering as a payoff heuristic — not a substitute for lender agreements.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant={sort === "avalanche" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("avalanche")}
            className={sort === "avalanche" ? "bg-primary" : ""}
          >
            <Flame className="w-4 h-4 mr-1" /> Avalanche
          </Button>
          <Button
            type="button"
            variant={sort === "snowball" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("snowball")}
            className={sort === "snowball" ? "bg-primary" : ""}
          >
            <ArrowDownWideNarrow className="w-4 h-4 mr-1" /> Snowball
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">₦{totals.outstanding.toLocaleString()}</CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Monthly payments (sum)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">₦{totals.monthly.toLocaleString()}</CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance-weighted APR</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.weightedApr.toFixed(2)}%</CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle>Debts ({sort} order)</CardTitle>
          <CardDescription>Highest priority at the top for your selected strategy.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No debt records. Add liabilities via the API or admin.</p>
          ) : (
            <div className="space-y-4">
              {sorted.map((d, idx) => (
                <div
                  key={d.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-border/50 rounded-lg p-4 bg-secondary/20"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                    <div>
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.lender || "—"}</p>
                      <Badge variant="outline" className="mt-1">
                        {DEBT_LABELS[d.debt_type] || d.debt_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm md:text-right">
                    <div>
                      <p className="text-muted-foreground text-xs">Outstanding</p>
                      <p className="font-medium">₦{parseFloat(d.outstanding).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">APR</p>
                      <p className="font-medium">{parseFloat(d.interest_rate_pct).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly</p>
                      <p className="font-medium">₦{parseFloat(d.monthly_payment).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Due</p>
                      <p className="font-medium">
                        {d.due_date ? new Date(d.due_date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

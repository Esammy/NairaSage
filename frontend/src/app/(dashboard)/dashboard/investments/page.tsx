"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { unwrapResults } from "@/lib/django-api";

const PortfolioPieSection = dynamic(
  () =>
    import("@/components/dashboard/PortfolioPieSection").then((m) => m.PortfolioPieSection),
  {
    ssr: false,
    loading: () => <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted/20" />,
  }
);

type Holding = {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  current_value: string;
  pnl: string;
  pnl_pct: number;
};

type Portfolio = {
  id: number;
  name: string;
  total_value: string;
  currency: string;
  risk_score: number | null;
  holdings: Holding[];
};

function riskLabel(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return "Not set";
  if (score < 3.5) return "Conservative";
  if (score < 6.5) return "Moderate";
  if (score < 8.5) return "Growth";
  return "Aggressive";
}

export default function InvestmentsPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdingsList, setHoldingsList] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [portRes, holdRes] = await Promise.all([
          fetch("/api/django/portfolio", { credentials: "include" }),
          fetch("/api/django/portfolio/holdings", { credentials: "include" }),
        ]);
        if (portRes.ok) setPortfolio(await portRes.json());
        if (holdRes.ok) {
          const body = await holdRes.json();
          setHoldingsList(unwrapResults<Holding>(body));
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const holdings = useMemo(() => {
    if (holdingsList.length > 0) return holdingsList;
    return portfolio?.holdings || [];
  }, [holdingsList, portfolio]);

  const totalValue = useMemo(() => {
    if (portfolio?.total_value != null) return parseFloat(portfolio.total_value);
    return holdings.reduce((s, h) => s + parseFloat(h.current_value || "0"), 0);
  }, [portfolio, holdings]);

  const pieData = useMemo(() => {
    const sum = holdings.reduce((s, h) => s + parseFloat(h.current_value || "0"), 0);
    if (sum <= 0) return [];
    return holdings.map((h) => ({
      name: h.symbol || h.name || h.asset_type,
      value: Math.round((parseFloat(h.current_value || "0") / sum) * 1000) / 10,
    }));
  }, [holdings]);

  const totalPnl = holdings.reduce((s, h) => s + parseFloat(h.pnl || "0"), 0);
  const pnlPct =
    totalValue > 0 && totalValue - totalPnl !== 0
      ? (totalPnl / (totalValue - totalPnl)) * 100
      : holdings.length
        ? holdings.reduce((s, h) => s + (h.pnl_pct || 0), 0) / holdings.length
        : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investment portfolio</h1>
          <p className="text-muted-foreground mt-1">Holdings and allocation from your live portfolio record.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="border-border text-foreground hover:bg-muted" disabled>
            <RefreshCw className="mr-2 h-4 w-4" /> Rebalance
          </Button>
          <Button type="button" className="bg-primary text-primary-foreground hover:bg-gold-600 shadow-md shadow-gold-500/20" disabled>
            Add holding
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total portfolio value</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <div className="text-4xl font-bold text-foreground">₦{totalValue.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground flex items-center mt-2">
                      <TrendingUp className="mr-1 h-4 w-4 text-emerald-500" />
                      Unrealized P&L: ₦{totalPnl.toLocaleString()}
                      {holdings.length ? ` (blended ~${pnlPct.toFixed(1)}%)` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {riskLabel(portfolio?.risk_score ?? null)}
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {holdings.length ? `${holdings.length} holding(s)` : "No holdings"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>Weights reflect current_value in NGN.</CardDescription>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No holdings yet. Add positions via the API or admin so the Investment Advisor can track
                  risk and performance.
                </p>
              ) : (
                <div className="space-y-4">
                  {holdings.map((holding) => {
                    const val = parseFloat(holding.current_value || "0");
                    const pnl = parseFloat(holding.pnl || "0");
                    return (
                      <div
                        key={holding.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary border border-primary/30 shrink-0">
                            {(holding.symbol || "NA").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {holding.symbol || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{holding.name}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">₦{val.toLocaleString()}</p>
                          <p className={pnl >= 0 ? "text-xs text-emerald-500" : "text-xs text-red-400"}>
                            {pnl >= 0 ? "+" : ""}₦{pnl.toLocaleString()} ({holding.pnl_pct?.toFixed(1) ?? "0"}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle>Asset mix</CardTitle>
            <CardDescription>Share of portfolio by holding (current value).</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12">Add holdings to see allocation.</p>
            ) : (
              <>
                <div className="h-[250px] w-full">
                  <PortfolioPieSection data={pieData} />
                </div>
                <div className="w-full mt-4 space-y-2">
                  {pieData.map((asset) => (
                    <div key={asset.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground truncate">{asset.name}</span>
                      </div>
                      <span className="font-medium text-foreground shrink-0">{asset.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

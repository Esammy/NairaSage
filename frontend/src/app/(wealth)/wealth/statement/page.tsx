"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinancialStatementDiagram } from "@/components/wealth/FinancialStatementDiagram";
import {
  AssetItem,
  FinancialStatementSnapshot,
  KiyosakiAssetType,
  LiabilityItem,
  formatNaira,
  wealthFetch,
} from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

const ASSET_TYPES: Array<{ value: KiyosakiAssetType; label: string; cashflow: boolean }> = [
  { value: "business", label: "Business (B-I Triangle)", cashflow: true },
  { value: "real_estate", label: "Real estate that pays rent", cashflow: true },
  { value: "paper", label: "Paper (stocks, bonds, REITs)", cashflow: true },
  { value: "commodity", label: "Commodity (gold, oil)", cashflow: false },
  { value: "ip", label: "Intellectual property / royalties", cashflow: true },
  { value: "cash_eq", label: "Cash equivalent", cashflow: false },
  { value: "other", label: "Other", cashflow: false },
];

type ListResponse<T> = { results: T[] } | T[];

function unwrap<T>(x: ListResponse<T> | null): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return x.results || [];
}

export default function WealthStatementPage() {
  const [snap, setSnap] = useState<FinancialStatementSnapshot | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    income_active: "",
    income_passive: "",
    income_portfolio: "",
    expenses_essential: "",
    expenses_doodad: "",
  });

  const load = async () => {
    setLoading(true);
    const [cur, as, ls] = await Promise.all([
      wealthFetch<FinancialStatementSnapshot>("wealth/snapshots/current/"),
      wealthFetch<ListResponse<AssetItem>>("wealth/assets/"),
      wealthFetch<ListResponse<LiabilityItem>>("wealth/liabilities/"),
    ]);
    if (cur) {
      setSnap(cur);
      setForm({
        income_active: cur.income_active || "0",
        income_passive: cur.income_passive || "0",
        income_portfolio: cur.income_portfolio || "0",
        expenses_essential: cur.expenses_essential || "0",
        expenses_doodad: cur.expenses_doodad || "0",
      });
    }
    setAssets(unwrap(as));
    setLiabilities(unwrap(ls));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const recompute = async () => {
    setSaving(true);
    const next = await wealthFetch<FinancialStatementSnapshot>("wealth/snapshots/recompute/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (next) setSnap(next);
    setSaving(false);
  };

  const addAsset = async () => {
    const draft: Partial<AssetItem> = {
      name: "New asset",
      kiyosaki_type: "paper",
      market_value: "0",
      monthly_cashflow: "0",
      notes: "",
      is_active: true,
    };
    const created = await wealthFetch<AssetItem>("wealth/assets/", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    if (created) setAssets((prev) => [created, ...prev]);
  };

  const saveAsset = async (a: AssetItem) => {
    await wealthFetch<AssetItem>(`wealth/assets/${a.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        name: a.name,
        kiyosaki_type: a.kiyosaki_type,
        market_value: a.market_value,
        monthly_cashflow: a.monthly_cashflow,
        notes: a.notes,
      }),
    });
  };

  const removeAsset = async (id: number) => {
    await wealthFetch(`wealth/assets/${id}/`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const addLiability = async () => {
    const draft: Partial<LiabilityItem> = {
      name: "New liability",
      is_good_debt: false,
      balance: "0",
      monthly_payment: "0",
      notes: "",
      is_active: true,
    };
    const created = await wealthFetch<LiabilityItem>("wealth/liabilities/", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    if (created) setLiabilities((prev) => [created, ...prev]);
  };

  const saveLiability = async (l: LiabilityItem) => {
    await wealthFetch<LiabilityItem>(`wealth/liabilities/${l.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        name: l.name,
        is_good_debt: l.is_good_debt,
        balance: l.balance,
        monthly_payment: l.monthly_payment,
        notes: l.notes,
      }),
    });
  };

  const removeLiability = async (id: number) => {
    await wealthFetch(`wealth/liabilities/${id}/`, { method: "DELETE" });
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  };

  const goodAssetTotal = useMemo(
    () => assets.filter((a) => parseFloat(a.monthly_cashflow) > 0).reduce((s, a) => s + parseFloat(a.market_value || "0"), 0),
    [assets],
  );
  const badDebtTotal = useMemo(
    () => liabilities.filter((l) => !l.is_good_debt).reduce((s, l) => s + parseFloat(l.balance || "0"), 0),
    [liabilities],
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-1/2 max-w-lg" />
        <div className="h-48 bg-muted/40 rounded-xl border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted/40 rounded-xl border border-border" />
          <div className="h-64 bg-muted/40 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Personal Financial Statement
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Your income, expense, asset, and liability view — the same diagram used in Rich
            Dad&apos;s Guide to Investing (cited reference). Assets put money in your pocket;
            classify line items so your Freedom Ratio stays honest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the Personal Financial Statement page and how to classify assets and liabilities." />
          <AskCoachLink title="Personal Financial Statement" />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This month at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialStatementDiagram snapshot={snap} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Edit this month</CardTitle>
              <CardDescription className="text-xs">
                Rebuilds the snapshot and re-grades your investor level.
              </CardDescription>
            </div>
            <Button size="sm" onClick={recompute} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Recompute</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "income_active", label: "Active income" },
              { key: "income_passive", label: "Passive income (rents / royalties)" },
              { key: "income_portfolio", label: "Portfolio income (dividends, interest)" },
              { key: "expenses_essential", label: "Essential expenses" },
              { key: "expenses_doodad", label: "Doodads (non-essential)" },
            ].map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted-foreground">{f.label}</label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  className="max-w-[180px] tabular-nums"
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement scoring</CardTitle>
            <CardDescription className="text-xs">
              Good assets and bad debt are the scoreboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Good (cashflow) assets</span>
              <span className="tabular-nums text-emerald-400">{formatNaira(goodAssetTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bad debt total</span>
              <span className="tabular-nums text-rose-400">{formatNaira(badDebtTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passive income</span>
              <span className="tabular-nums">{formatNaira(snap?.passive_income)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly expenses</span>
              <span className="tabular-nums">{formatNaira(snap?.total_expenses)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="font-semibold">Freedom Ratio</span>
              <span className="font-semibold tabular-nums text-primary">
                {(snap?.freedom_ratio || 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Asset column</CardTitle>
            <CardDescription className="text-xs">
              Classify each item: true assets put net cash in your pocket (cited framework).
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={addAsset}>
            <Plus className="h-4 w-4" /> <span className="ml-1">Add asset</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {assets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No assets yet. Add your first cashflow asset or open the coach for a guided first step.
            </p>
          )}
          {assets.map((a) => (
            <div key={a.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center rounded-md border border-border p-2">
              <Input
                className="sm:col-span-2"
                value={a.name}
                onChange={(e) => setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))}
                onBlur={() => saveAsset(a)}
              />
              <select
                className="rounded-md bg-background border border-border px-2 py-2 text-sm"
                value={a.kiyosaki_type}
                onChange={(e) => {
                  const kt = e.target.value as KiyosakiAssetType;
                  setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, kiyosaki_type: kt } : x)));
                  saveAsset({ ...a, kiyosaki_type: kt });
                }}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Market value"
                className="tabular-nums"
                value={a.market_value}
                onChange={(e) => setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, market_value: e.target.value } : x)))}
                onBlur={() => saveAsset(a)}
              />
              <Input
                type="number"
                placeholder="Monthly cashflow"
                className="tabular-nums"
                value={a.monthly_cashflow}
                onChange={(e) => setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, monthly_cashflow: e.target.value } : x)))}
                onBlur={() => saveAsset(a)}
              />
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeAsset(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Liability column</CardTitle>
            <CardDescription className="text-xs">
              Tag each liability as good debt (bought an asset) or bad debt (bought a doodad).
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={addLiability}>
            <Plus className="h-4 w-4" /> <span className="ml-1">Add liability</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {liabilities.length === 0 && (
            <p className="text-sm text-muted-foreground">No liabilities listed.</p>
          )}
          {liabilities.map((l) => (
            <div key={l.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center rounded-md border border-border p-2">
              <Input
                className="sm:col-span-2"
                value={l.name}
                onChange={(e) => setLiabilities((prev) => prev.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))}
                onBlur={() => saveLiability(l)}
              />
              <select
                className="rounded-md bg-background border border-border px-2 py-2 text-sm"
                value={l.is_good_debt ? "good" : "bad"}
                onChange={(e) => {
                  const v = e.target.value === "good";
                  setLiabilities((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_good_debt: v } : x)));
                  saveLiability({ ...l, is_good_debt: v });
                }}
              >
                <option value="bad">Bad debt</option>
                <option value="good">Good debt</option>
              </select>
              <Input
                type="number"
                placeholder="Balance"
                className="tabular-nums"
                value={l.balance}
                onChange={(e) => setLiabilities((prev) => prev.map((x) => (x.id === l.id ? { ...x, balance: e.target.value } : x)))}
                onBlur={() => saveLiability(l)}
              />
              <Input
                type="number"
                placeholder="Monthly payment"
                className="tabular-nums"
                value={l.monthly_payment}
                onChange={(e) => setLiabilities((prev) => prev.map((x) => (x.id === l.id ? { ...x, monthly_payment: e.target.value } : x)))}
                onBlur={() => saveLiability(l)}
              />
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeLiability(l.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

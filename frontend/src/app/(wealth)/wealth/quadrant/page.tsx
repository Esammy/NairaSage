"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CashflowQuadrant } from "@/components/wealth/CashflowQuadrant";
import type { QuadrantProfile } from "@/lib/wealth";
import { wealthFetch } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

const QUADRANT_INFO: Array<{ key: "E" | "S" | "B" | "I"; title: string; kiyosaki: string }> = [
  {
    key: "E",
    title: "Employee",
    kiyosaki: "Values security. Works for a system. Highest tax, lowest leverage.",
  },
  {
    key: "S",
    title: "Self-Employed / Specialist",
    kiyosaki: "The job IS the business. Trades time for money. Loves control.",
  },
  {
    key: "B",
    title: "Business Owner",
    kiyosaki: "Owns a system others run. B-I Triangle integrity. Leverage of people.",
  },
  {
    key: "I",
    title: "Investor",
    kiyosaki: "Money works instead of you. Lowest tax. Compounding + 10 Controls.",
  },
];

export default function WealthQuadrantPage() {
  const [profile, setProfile] = useState<QuadrantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await wealthFetch<QuadrantProfile>("wealth/quadrant/");
      setProfile(res);
      setLoading(false);
    })();
  }, []);

  const totalNow = useMemo(() => {
    if (!profile) return 0;
    return (profile.pct_e || 0) + (profile.pct_s || 0) + (profile.pct_b || 0) + (profile.pct_i || 0);
  }, [profile]);

  const targetTotal = useMemo(() => {
    if (!profile) return 0;
    return (profile.target_pct_b || 0) + (profile.target_pct_i || 0);
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const res = await wealthFetch<QuadrantProfile>("wealth/quadrant/", {
      method: "PATCH",
      body: JSON.stringify({
        pct_e: profile.pct_e,
        pct_s: profile.pct_s,
        pct_b: profile.pct_b,
        pct_i: profile.pct_i,
        target_pct_b: profile.target_pct_b,
        target_pct_i: profile.target_pct_i,
        target_year: profile.target_year,
      }),
    });
    if (res) setProfile(res);
    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-2/3 max-w-md" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-80 bg-muted/40 rounded-xl border border-border" />
          <div className="lg:col-span-2 h-80 bg-muted/40 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            CASHFLOW Quadrant
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            How you earn shapes how free you become. Based on principles from Rich Dad&apos;s
            Guide to Investing (cited reference): many paths shift share from E/S toward B/I,
            where leverage and tax design often matter more.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the CASHFLOW Quadrant page and how to plan my shift from E/S to B/I." />
          <AskCoachLink title="CASHFLOW Quadrant" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where you are vs where you are going</CardTitle>
            <CardDescription className="text-xs">
              The dot shows your current income mix. The ring shows your target.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CashflowQuadrant profile={profile} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Plan your shift</CardTitle>
              <CardDescription className="text-xs">
                Your four income percentages should add to 100.
              </CardDescription>
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-1">Save</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</div>
              {(["E", "S", "B", "I"] as const).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-6 font-semibold">{k}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={profile[`pct_${k.toLowerCase()}` as keyof QuadrantProfile] as number}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [`pct_${k.toLowerCase()}`]: Math.max(0, Math.min(100, Number(e.target.value))),
                      } as QuadrantProfile)
                    }
                    className="max-w-[100px] tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">
                Total: {Math.round(totalNow)}%
                {totalNow !== 100 && <span className="text-rose-400"> (should equal 100)</span>}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target (right-side only)</div>
              {(["B", "I"] as const).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-6 font-semibold">{k}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={profile[`target_pct_${k.toLowerCase()}` as keyof QuadrantProfile] as number}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [`target_pct_${k.toLowerCase()}`]: Math.max(0, Math.min(100, Number(e.target.value))),
                      } as QuadrantProfile)
                    }
                    className="max-w-[100px] tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="w-6">Year</span>
                <Input
                  type="number"
                  min={new Date().getFullYear()}
                  value={profile.target_year || new Date().getFullYear() + 5}
                  onChange={(e) => setProfile({ ...profile, target_year: Number(e.target.value) })}
                  className="max-w-[120px] tabular-nums"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Target B+I: {Math.round(targetTotal)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUADRANT_INFO.map((q) => (
          <Card key={q.key} className={q.key === "B" || q.key === "I" ? "border-primary/50" : undefined}>
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-bold ${
                    q.key === "B" || q.key === "I"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {q.key}
                </div>
                <CardTitle className="text-sm">{q.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{q.kiyosaki}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

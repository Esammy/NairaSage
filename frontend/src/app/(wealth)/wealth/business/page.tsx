"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BITriangle } from "@/components/wealth/BITriangle";
import type { BITriangleScore } from "@/lib/wealth";
import { wealthFetch } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

type Key = Exclude<keyof BITriangleScore, "overall">;

const SECTIONS: Array<{ key: Key; title: string; blurb: string; layer: "outer" | "inner" }> = [
  { key: "mission", title: "Mission", blurb: "A why bigger than money. Drives the whole triangle.", layer: "outer" },
  { key: "leadership", title: "Leadership", blurb: "Who sets direction. Can they recruit, decide, and cast vision?", layer: "outer" },
  { key: "team", title: "Team", blurb: "Attorneys, accountants, coaches, mentors, operators.", layer: "outer" },
  { key: "product", title: "Product", blurb: "The thing the customer buys; clarity of offer.", layer: "inner" },
  { key: "legal", title: "Legal", blurb: "Entity, contracts, IP, compliance.", layer: "inner" },
  { key: "systems", title: "Systems", blurb: "Repeatable processes that run without you.", layer: "inner" },
  { key: "communications", title: "Communications", blurb: "Marketing, sales, internal comms, investor relations.", layer: "inner" },
  { key: "cashflow", title: "Cash Flow", blurb: "The bottom of the triangle - money must flow.", layer: "inner" },
];

export default function BusinessPage() {
  const [score, setScore] = useState<BITriangleScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Key | "overall" | null>(null);

  useEffect(() => {
    (async () => {
      const res = await wealthFetch<BITriangleScore>("wealth/bi-triangle/");
      setScore(res || null);
      setLoading(false);
    })();
  }, []);

  const setField = (k: Key, v: number) => {
    if (!score) return;
    const clamped = Math.max(0, Math.min(100, v));
    const next: BITriangleScore = { ...score, [k]: clamped };
    const values = SECTIONS.map((s) => next[s.key] as number);
    next.overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    setScore(next);
  };

  const save = async () => {
    if (!score) return;
    setSaving(true);
    const res = await wealthFetch<BITriangleScore>("wealth/bi-triangle/", {
      method: "PATCH",
      body: JSON.stringify(score),
    });
    if (res) setScore(res);
    setSaving(false);
  };

  if (loading || !score) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-2/3 col-span-full" />
        <div className="h-[400px] bg-muted/40 rounded-xl border border-border" />
        <div className="h-[400px] bg-muted/40 rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            The B-I Triangle
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Eight integrities for a strong business (cited reference: Rich Dad frameworks). Three
            outer layers — Mission, Leadership, Team — over five inner bands.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the B-I Triangle and which integrity I should improve first." />
          <AskCoachLink title="B-I Triangle" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Triangle score</CardTitle>
            <CardDescription className="text-xs">
              Click any band for details. Weakest band drags the whole triangle down.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BITriangle score={score} selectedKey={selected} onSelect={(k) => setSelected(k)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Score each integrity</CardTitle>
              <CardDescription className="text-xs">0 - 100 per integrity.</CardDescription>
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-1">Save</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {SECTIONS.map((s) => (
              <div
                key={s.key}
                className={`rounded-md border p-2 ${
                  selected === s.key ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {s.title}
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.layer}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.blurb}</p>
                  </div>
                  <div className="tabular-nums text-sm font-semibold">{score[s.key]}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={score[s.key] as number}
                  onChange={(e) => setField(s.key, Number(e.target.value))}
                  onFocus={() => setSelected(s.key)}
                  className="w-full mt-2 accent-[#d4af37]"
                />
              </div>
            ))}
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Overall</span>
                <span className="tabular-nums font-bold text-primary">{score.overall}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Practical rule from the cited framework: improve the lowest band first.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PHASES, type RichDadPhase, wealthFetch } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

type MilestonesCatalog = Record<string, Array<{ key: string; title: string }>>;

export default function WealthPathPage() {
  const [phase, setPhase] = useState<RichDadPhase | null>(null);
  const [catalog, setCatalog] = useState<MilestonesCatalog>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<number>(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, cockpit] = await Promise.all([
        wealthFetch<RichDadPhase>("wealth/phase/"),
        wealthFetch<{ milestones_catalog: MilestonesCatalog }>("wealth/cockpit/"),
      ]);
      if (p) {
        setPhase(p);
        setNotes(p.phase_notes || "");
        setSelectedPhase(p.current_phase);
      }
      if (cockpit?.milestones_catalog) setCatalog(cockpit.milestones_catalog);
      setLoading(false);
    })();
  }, []);

  const currentPhase = phase?.current_phase || 1;
  const progress = phase?.phase_progress || {};

  const toggleMilestone = (phaseNum: number, key: string, done: boolean) => {
    if (!phase) return;
    const phaseStr = String(phaseNum);
    const existing = progress[phaseStr]?.milestones || [];
    const updated = existing.some((m) => m.key === key)
      ? existing.map((m) => (m.key === key ? { ...m, done } : m))
      : [...existing, { key, done, noted_at: new Date().toISOString() }];
    const nextProgress = {
      ...progress,
      [phaseStr]: { ...(progress[phaseStr] || {}), milestones: updated },
    };
    setPhase({ ...phase, phase_progress: nextProgress });
  };

  const save = async () => {
    if (!phase) return;
    setSaving(true);
    const res = await wealthFetch<RichDadPhase>("wealth/phase/", {
      method: "PATCH",
      body: JSON.stringify({
        current_phase: phase.current_phase,
        phase_progress: phase.phase_progress,
        phase_notes: notes,
      }),
    });
    if (res) setPhase(res);
    setSaving(false);
  };

  const phaseCompletion = useMemo(() => {
    const out: Record<number, { done: number; total: number }> = {};
    for (const p of PHASES) {
      const milestones = catalog[String(p.id)] || [];
      const user = progress[String(p.id)]?.milestones || [];
      const done = user.filter((m) => m.done).length;
      out[p.id] = { done, total: milestones.length };
    }
    return out;
  }, [catalog, progress]);

  if (loading || !phase) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-md w-1/2" />
        <div className="h-12 bg-muted/50 rounded-lg" />
        <div className="h-96 bg-muted/40 rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            The 5 Phases
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            A sequenced investor plan from Rich Dad&apos;s Guide to Investing (cited reference).
            Tick milestones here; the NairaSage Coach can narrate what each phase means for you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain the 5 Phases path and which phase I should focus on now." />
          <AskCoachLink title="the 5 Phases path" />
        </div>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {PHASES.map((p) => {
          const active = selectedPhase === p.id;
          const reached = p.id <= currentPhase;
          const comp = phaseCompletion[p.id];
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPhase(p.id)}
              className={`flex-1 min-w-[160px] rounded-lg border p-3 text-left transition ${
                active
                  ? "border-primary bg-primary/10"
                  : reached
                    ? "border-border bg-card hover:bg-secondary/60"
                    : "border-dashed border-border bg-card/50 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.id <= currentPhase ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.id}
                </div>
                <div className="text-sm font-semibold">{p.title}</div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{comp.done} / {comp.total} milestones</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: comp.total ? `${(comp.done / comp.total) * 100}%` : "0%" }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Phase {selectedPhase}: {PHASES.find((p) => p.id === selectedPhase)?.title}
            </CardTitle>
            <CardDescription className="text-xs">
              {PHASES.find((p) => p.id === selectedPhase)?.blurb}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPhase({ ...phase, current_phase: selectedPhase as 1 | 2 | 3 | 4 | 5 });
              }}
            >
              Set as current
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-1">Save</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(catalog[String(selectedPhase)] || []).map((m) => {
            const user = progress[String(selectedPhase)]?.milestones || [];
            const done = user.some((x) => x.key === m.key && x.done);
            return (
              <button
                key={m.key}
                onClick={() => toggleMilestone(selectedPhase, m.key, !done)}
                className="w-full flex items-start gap-3 rounded-md border border-border p-3 text-left hover:bg-secondary/40 transition"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <span className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {m.title}
                </span>
              </button>
            );
          })}
          {(catalog[String(selectedPhase)] || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No milestones listed for this phase.</p>
          )}
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
              placeholder="Reflections, commitments, questions for the coach..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CoachMemoryRow } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";
import { unwrapResults } from "@/lib/django-api";

export default function WealthMemoryPage() {
  const [rows, setRows] = useState<CoachMemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/django/wealth/coach-memories/", { credentials: "include" });
      if (!res.ok) {
        setErr("Could not load memories.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as unknown;
      setRows(unwrapResults<CoachMemoryRow>(data));
    } catch {
      setErr("Could not load memories.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const forget = async (id: number) => {
    try {
      const res = await fetch(`/api/django/wealth/coach-memories/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setErr("Forget failed.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setErr("Forget failed.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Coach memory</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Facts and preferences the NairaSage Coach may use across sessions. Forget anything you
            do not want stored.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain how coach memory works and how I can manage it." />
          <AskCoachLink title="coach memory" />
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stored items</CardTitle>
          <CardDescription className="text-xs">
            Deleting removes an item from what the coach can cite (soft forget on the server).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!loading && !err && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No memories yet. Chat with the coach on the Wealth Cockpit; durable notes may appear
              here after conversations.
            </p>
          )}
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.kind}
                  </div>
                  <p className="text-sm text-foreground mt-1">{r.content}</p>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => void forget(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Forget
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

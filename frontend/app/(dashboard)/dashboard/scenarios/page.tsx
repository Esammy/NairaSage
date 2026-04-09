"use client";

import { useState } from "react";
import api from "@/lib/api";
import { DashboardModulePlaceholder } from "@/components/dashboard/DashboardModulePlaceholder";

export default function ScenariosPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await api.post("/agent/scenario/", { scenario: q });
      const body = res.data as { response?: string; summary?: string };
      setResult(body.response || body.summary || JSON.stringify(body));
    } catch {
      setErr("Could not run scenario. Try again or use the coordinator chat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardModulePlaceholder
      title="Scenario war-gaming"
      description="Explore “what if” questions with the life planner path on the API. This is educational simulation—not a guarantee of outcomes."
    >
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-ink">Scenario</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g. What if I save ₦100k more per month for two years?"
          className="w-full rounded-xl border border-ink-faint/20 px-4 py-3 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="rounded-lg bg-ns-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60"
        >
          {loading ? "Running…" : "Run scenario"}
        </button>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {result ? (
          <div className="rounded-xl border border-ink-faint/15 bg-surface p-4 text-sm text-ink whitespace-pre-wrap">
            {result}
          </div>
        ) : null}
      </div>
    </DashboardModulePlaceholder>
  );
}

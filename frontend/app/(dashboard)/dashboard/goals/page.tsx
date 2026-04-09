"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type Goal = {
  id: number;
  title: string;
  target_amount: string;
  saved_amount: string;
  target_date: string | null;
  is_active: boolean;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("/goals/");
      const raw = res.data?.results ?? res.data;
      setGoals(Array.isArray(raw) ? raw : []);
    } catch {
      setErr("Could not load goals.");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.post("/goals/", {
        title: title.trim(),
        description: "",
        target_amount: target,
        saved_amount: saved || "0",
        is_active: true,
      });
      setTitle("");
      setTarget("");
      setSaved("0");
      void load();
    } catch {
      setErr("Could not create goal. Check amounts are valid numbers.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand">Savings goals</h1>
      <p className="mt-1 text-sm text-ink-muted">Track targets in NGN. Data is stored on your account.</p>

      <form onSubmit={addGoal} className="mt-8 grid gap-3 rounded-2xl border border-ink-faint/15 bg-white p-6 max-w-lg">
        <h2 className="text-sm font-bold text-ink">Add goal</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Goal title"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
          placeholder="Target amount (NGN)"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={saved}
          onChange={(e) => setSaved(e.target.value)}
          placeholder="Already saved (NGN)"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-light">
          Save goal
        </button>
      </form>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wider">Your goals</h2>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-ink-muted">No goals yet.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="rounded-xl border border-ink-faint/15 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{g.title}</span>
                <span className="text-ink-muted">
                  {" "}
                  — saved {g.saved_amount} / target {g.target_amount} NGN
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

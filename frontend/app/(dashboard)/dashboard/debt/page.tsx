"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type DebtRow = {
  id: number;
  name: string;
  debt_type: string;
  outstanding: string;
  monthly_payment: string;
  interest_rate_pct: string;
};

const DEBT_TYPES = [
  { value: "personal_loan", label: "Personal loan" },
  { value: "credit_card", label: "Credit card" },
  { value: "mortgage", label: "Mortgage" },
  { value: "other", label: "Other" },
];

export default function DebtPage() {
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [debtType, setDebtType] = useState("personal_loan");
  const [original, setOriginal] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [rate, setRate] = useState("12");
  const [payment, setPayment] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/debt/");
      const raw = res.data?.results ?? res.data;
      setRows(Array.isArray(raw) ? raw : []);
    } catch {
      setErr("Could not load debt records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.post("/debt/", {
        name: name.trim(),
        debt_type: debtType,
        lender: "",
        original_amount: original,
        outstanding,
        interest_rate_pct: rate,
        monthly_payment: payment,
        notes: "",
      });
      setName("");
      setOriginal("");
      setOutstanding("");
      setPayment("");
      void load();
    } catch {
      setErr("Could not save. Check all numeric fields.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand">Debt</h1>
      <p className="mt-1 text-sm text-ink-muted">Track liabilities and payments (educational planning only).</p>

      <form onSubmit={submit} className="mt-8 grid gap-3 rounded-2xl border border-ink-faint/15 bg-white p-6 max-w-lg">
        <h2 className="text-sm font-bold text-ink">Add debt</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Name / label"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <select
          value={debtType}
          onChange={(e) => setDebtType(e.target.value)}
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        >
          {DEBT_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          required
          placeholder="Original amount"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={outstanding}
          onChange={(e) => setOutstanding(e.target.value)}
          required
          placeholder="Outstanding"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Interest % p.a."
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          required
          placeholder="Monthly payment"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-light">
          Save
        </button>
      </form>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wider">Your debts</h2>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-muted">No records yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => (
              <li key={d.id} className="rounded-xl border border-ink-faint/15 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{d.name}</span>
                <span className="text-ink-muted">
                  {" "}
                  — outstanding {d.outstanding} NGN, {d.interest_rate_pct}% APR, {d.monthly_payment}/mo
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

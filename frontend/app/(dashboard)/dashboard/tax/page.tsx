"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type TaxRecord = {
  id: number;
  tax_year: number;
  label: string;
  amount_ngn: string;
  record_type: string;
};

export default function TaxPage() {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [recordType, setRecordType] = useState("other");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tax/records/");
      const raw = res.data?.results ?? res.data;
      setRecords(Array.isArray(raw) ? raw : []);
    } catch {
      setErr("Could not load tax records.");
      setRecords([]);
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
      await api.post("/tax/records/", {
        tax_year: parseInt(year, 10),
        label: label.trim(),
        amount_ngn: amount,
        record_type: recordType,
        notes: "",
      });
      setLabel("");
      setAmount("");
      void load();
    } catch {
      setErr("Could not save record.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand">Tax records</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Log amounts for your own tracking. This is not tax filing software or FIRS advice.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-3 rounded-2xl border border-ink-faint/15 bg-white p-6 max-w-lg">
        <h2 className="text-sm font-bold text-ink">Add record</h2>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required
          type="number"
          placeholder="Tax year"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          placeholder="Label"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="Amount (NGN)"
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        />
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
          className="rounded-lg border border-ink-faint/20 px-3 py-2 text-sm"
        >
          <option value="paye">PAYE</option>
          <option value="vat">VAT</option>
          <option value="self_assessment">Self assessment</option>
          <option value="other">Other</option>
        </select>
        <button type="submit" className="rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-light">
          Save record
        </button>
      </form>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wider">Your records</h2>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-ink-muted">No records yet.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id} className="rounded-xl border border-ink-faint/15 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-ink">
                  {r.tax_year} — {r.label}
                </span>
                <span className="text-ink-muted">
                  {" "}
                  — {r.amount_ngn} NGN ({r.record_type})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

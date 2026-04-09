"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import api from "@/lib/api";

type GenericRecord = Record<string, unknown>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toList(value: unknown): GenericRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is GenericRecord => typeof item === "object" && item !== null);
  }
  if (typeof value === "object" && value !== null && Array.isArray((value as { results?: unknown[] }).results)) {
    return (value as { results?: unknown[] }).results!.filter(
      (item): item is GenericRecord => typeof item === "object" && item !== null
    );
  }
  return [];
}

export default function DashboardHomePage() {
  const queries = useQueries({
    queries: [
      { queryKey: ["dashboard", "dna"], queryFn: () => api.get("/dna/").then((r) => r.data), staleTime: 60_000 },
      { queryKey: ["dashboard", "accounts"], queryFn: () => api.get("/accounts/").then((r) => r.data), staleTime: 60_000 },
      {
        queryKey: ["dashboard", "transactions"],
        queryFn: () => api.get("/transactions/").then((r) => r.data),
        staleTime: 60_000,
      },
      { queryKey: ["dashboard", "portfolio"], queryFn: () => api.get("/portfolio/").then((r) => r.data), staleTime: 60_000 },
      {
        queryKey: ["dashboard", "opportunities"],
        queryFn: () => api.get("/opportunities/").then((r) => r.data),
        staleTime: 60_000,
      },
      { queryKey: ["dashboard", "notify"], queryFn: () => api.get("/notify/").then((r) => r.data), staleTime: 30_000 },
    ],
  });

  const loading = queries.some((q) => q.isLoading);
  const error = queries.some((q) => q.isError);

  const dnaD = queries[0].data;
  const accD = queries[1].data;
  const txD = queries[2].data;
  const portD = queries[3].data;
  const oppD = queries[4].data;
  const notD = queries[5].data;

  const snapshot = useMemo(() => {
    const dna = (dnaD || {}) as GenericRecord;
    const accountList = toList(accD);
    const txList = toList(txD);
    const portfolio = (portD || {}) as GenericRecord;
    const holdingsList = toList(portfolio?.holdings);
    const opportunityList = toList(oppD);
    const notifyList = toList(notD);
    const totalBalance = accountList.reduce((sum, account) => sum + Number(account.balance || 0), 0);

    return {
      monthlyIncome:
        typeof dna?.monthly_income === "string" || typeof dna?.monthly_income === "number"
          ? String(dna.monthly_income)
          : "--",
      primaryGoal:
        typeof dna?.primary_goal === "string" && dna.primary_goal
          ? dna.primary_goal
          : "Set your first financial objective",
      accountsCount: accountList.length,
      totalBalance,
      txCount: txList.length,
      holdingsCount: holdingsList.length,
      opportunitiesCount: opportunityList.length,
      unreadNotifications: notifyList.filter((item) => !item?.is_read).length,
    };
  }, [dnaD, accD, txD, portD, oppD, notD]);

  const cards = useMemo(
    () => [
      { label: "Linked accounts", value: snapshot.accountsCount, helper: "Connected accounts in NairaSage" },
      { label: "Cash position", value: formatCurrency(snapshot.totalBalance), helper: "Total visible balance (NGN)" },
      { label: "Transactions", value: snapshot.txCount, helper: "Imported records" },
      { label: "Holdings", value: snapshot.holdingsCount, helper: "Portfolio line items" },
      { label: "Opportunities", value: snapshot.opportunitiesCount, helper: "Surfaced matches" },
      { label: "Unread alerts", value: snapshot.unreadNotifications, helper: "Notifications" },
    ],
    [snapshot]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-ink-faint/10 bg-white p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Overview</p>
        <h1 className="mt-2 text-3xl font-bold text-ns-primary">Your financial command center</h1>
        <p className="mt-3 text-ink-muted">
          Primary goal: <span className="font-semibold text-ink">{snapshot.primaryGoal}</span>
        </p>
        <p className="mt-1 text-ink-muted">
          Monthly income (DNA): <span className="font-semibold text-ink">{snapshot.monthlyIncome}</span>
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/chat"
            className="rounded-lg bg-ns-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
          >
            Open coordinator
          </Link>
          <Link
            href="/dashboard/accounts"
            className="rounded-lg border border-ink-faint/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Accounts
          </Link>
          <Link
            href="/dashboard/investments"
            className="rounded-lg border border-ink-faint/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Investments
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Some dashboard data could not be loaded. Refresh or open the coordinator for help.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-ink-faint/10 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-ink-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-ink">{loading ? "…" : card.value}</p>
            <p className="mt-2 text-sm text-ink-muted">{card.helper}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

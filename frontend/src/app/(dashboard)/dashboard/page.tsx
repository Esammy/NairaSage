"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, Wallet, TrendingUp, Lightbulb, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { unwrapResults } from "@/lib/django-api";

const NetWorthAreaChart = dynamic(
  () =>
    import("@/components/dashboard/NetWorthAreaChart").then((m) => m.NetWorthAreaChart),
  {
    ssr: false,
    loading: () => <div className="min-h-[220px] w-full animate-pulse rounded-lg bg-muted/20" />,
  }
);

type Summary = {
  cash_total: string;
  investments_total: string;
  debt_total: string;
  net_worth: string;
  monthly_debt_service: string;
  goal_count: number;
  pending_opportunities: number;
};

type TransactionRow = {
  id: number;
  description: string;
  category: string;
  ai_category?: string;
  type: string;
  amount: string;
  date: string;
  merchant?: string;
};

type Dna = {
  primary_goal?: string;
  risk_tolerance?: string;
  occupation?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  food_dining: "Food & Dining",
  transport: "Transport",
  utilities: "Utilities",
  entertainment: "Entertainment",
  health: "Healthcare",
  education: "Education",
  investment: "Investment",
  savings: "Savings",
  income: "Income",
  transfer: "Transfer",
  subscription: "Subscriptions",
  shopping: "Shopping",
  rent: "Rent / Housing",
  insurance: "Insurance",
  loan_repayment: "Loan Repayment",
  other: "Other",
};

function formatCategory(code: string) {
  return CATEGORY_LABELS[code] || code.replace(/_/g, " ") || "Other";
}

function formatTxDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [dna, setDna] = useState<Dna | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, tRes, dRes] = await Promise.all([
          fetch("/api/django/accounts/dashboard", { credentials: "include" }),
          fetch("/api/django/transactions?ordering=-date", { credentials: "include" }),
          fetch("/api/django/dna", { credentials: "include" }),
        ]);
        if (sRes.ok) setSummary(await sRes.json());
        if (tRes.ok) {
          const body = await tRes.json();
          setTransactions(unwrapResults<TransactionRow>(body).slice(0, 8));
        }
        if (dRes.ok) setDna(await dRes.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const netWorth = summary ? parseFloat(summary.net_worth) : 0;
  const investments = summary ? parseFloat(summary.investments_total) : 0;
  const cash = summary ? parseFloat(summary.cash_total) : 0;
  const debt = summary ? parseFloat(summary.debt_total) : 0;

  const insight =
    dna?.primary_goal || dna?.risk_tolerance
      ? `Your stated focus is ${dna.primary_goal || "building wealth"} with a ${dna.risk_tolerance || "balanced"} risk posture. Connect accounts and add goals so NairaSage can suggest specific next steps.`
      : "Complete your Financial DNA profile (onboarding and settings) so NairaSage can tailor guidance to your income, goals, and risk comfort.";

  const chartPlaceholder = [{ name: "—", value: 0 }];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial overview</h1>
          <p className="text-muted-foreground mt-1">Net worth, cash, investments, and recent activity.</p>
        </div>
        <Button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-gold-600 shadow-md shadow-gold-500/20"
          disabled
          title="Account linking is not enabled in this build"
        >
          Link New Account
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net worth</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">₦{netWorth.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cash ₦{cash.toLocaleString()} + investments ₦{investments.toLocaleString()} − debt ₦
                  {debt.toLocaleString()}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investments (portfolio)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">₦{investments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="inline-flex items-center">
                    {summary && summary.goal_count > 0 ? (
                      <>
                        <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                        {summary.goal_count} savings goal{summary.goal_count === 1 ? "" : "s"} on file
                      </>
                    ) : (
                      "Add a savings goal to align investing with milestones."
                    )}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> NairaSage note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 leading-relaxed">{insight}</p>
            {summary && summary.pending_opportunities > 0 ? (
              <p className="text-xs text-primary mt-2">
                {summary.pending_opportunities} open{" "}
                {summary.pending_opportunities === 1 ? "opportunity" : "opportunities"} in Opportunity Scout.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-card border-border/50">
          <CardHeader>
            <CardTitle>Net worth trend</CardTitle>
            <CardDescription>
              Historical snapshots are not stored yet. When monthly balances are recorded, this chart
              will show your trajectory.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col min-w-0">
            <div className="flex-1 min-h-[220px] min-w-0 w-full">
              <NetWorthAreaChart data={chartPlaceholder} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest transactions from linked accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet. Sync or import account data.</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => {
                  const amt = Number(tx.amount);
                  const signed = tx.type === "credit" ? amt : -amt;
                  const label = tx.merchant || tx.description;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between group rounded-md transition-colors hover:bg-muted/50 p-2 -mx-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCategory(tx.category || tx.ai_category || "")} • {formatTxDate(tx.date)}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-semibold shrink-0 ml-2 ${signed >= 0 ? "text-emerald-500" : "text-foreground"}`}
                      >
                        {signed >= 0 ? "+" : "−"}₦{Math.abs(signed).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/dashboard/accounts"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full mt-4 inline-flex border-border text-foreground hover:bg-muted"
              )}
            >
              Accounts
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

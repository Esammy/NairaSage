"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, Sparkles, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { unwrapResults } from "@/lib/django-api";

type Opportunity = {
  id: number;
  opp_type: string;
  title: string;
  description: string;
  source_url: string;
  match_score: number;
  urgency_score: number;
  deadline: string | null;
  estimated_value: string | null;
  is_actioned: boolean;
  is_dismissed: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  grant: "Grant / Program",
  investment: "Investment Product",
  ipo: "IPO / New Listing",
  side_income: "Side Income",
  real_estate: "Real Estate",
  bank_product: "Bank Product",
  tbill: "T-Bill / Bond",
  job: "Contract / Job",
};

function typeLabel(t: string) {
  return TYPE_LABELS[t] || t;
}

function formatDeadline(d: string | null) {
  if (!d) return "No fixed date";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function OpportunitiesPage() {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/django/opportunities", { credentials: "include" });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const body = await res.json();
      setRows(unwrapResults<Opportunity>(body).filter((o) => !o.is_dismissed));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss(id: number) {
    setUpdatingId(id);
    try {
      await fetch(`/api/django/opportunities/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_dismissed: true }),
      });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function markActioned(id: number) {
    setUpdatingId(id);
    try {
      await fetch(`/api/django/opportunities/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_actioned: true }),
      });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Opportunity Scout <Sparkles className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-muted-foreground mt-1">Opportunities stored for your account from scout runs.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-border/50 rounded-lg p-4 bg-muted/30">
          No open opportunities. When the scout agent creates records, they will appear here with match
          and urgency scores.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rows.map((opp, i) => (
          <Card key={opp.id} className="glass-card relative overflow-hidden border-border/50 flex flex-col h-full">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${i === 0 ? "bg-primary" : "bg-muted"}`} />
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 shrink-0">
                  {typeLabel(opp.opp_type)}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full shrink-0">
                  <Clock className="w-3 h-3 mr-1" /> Urgency {opp.urgency_score.toFixed(0)}
                </div>
              </div>
              <CardTitle className="text-xl mt-3">{opp.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-emerald-500 font-semibold">{Math.round(opp.match_score)}% match</span>
                <span className="w-1 h-1 bg-border rounded-full hidden sm:block" />
                <span>{formatDeadline(opp.deadline)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-foreground/80 leading-relaxed">{opp.description}</p>
              {opp.estimated_value ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Est. value: ₦{parseFloat(opp.estimated_value).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="pt-4 border-t border-border/30 bg-background/20 flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={updatingId === opp.id}
                  onClick={() => dismiss(opp.id)}
                >
                  Dismiss
                </Button>
                {opp.source_url ? (
                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
                  >
                    Source <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                ) : null}
              </div>
              <Button
                type="button"
                className="bg-primary text-primary-foreground hover:bg-gold-600 w-full sm:w-auto sm:ml-auto"
                disabled={updatingId === opp.id}
                onClick={() => markActioned(opp.id)}
              >
                Mark done <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

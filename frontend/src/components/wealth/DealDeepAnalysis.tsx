"use client";

import React, { useRef, useState } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InvestorControls } from "@/lib/wealth";

export type DeepAnalysisScores = {
  scores: Partial<Record<keyof InvestorControls, number>>;
  verdict: string;
  headline: string;
};

type Status = "idle" | "running" | "done" | "error";

/**
 * Streams the Qwen thinking-model deal analysis: the model's live reasoning
 * renders in a collapsible panel, the verdict streams below it, and the final
 * structured scores can be applied to the 10-controls checklist (user-confirmed).
 */
export function DealDeepAnalysis({
  dealId,
  onApplyScores,
}: {
  dealId: string | number;
  onApplyScores?: (scores: DeepAnalysisScores) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [scores, setScores] = useState<DeepAnalysisScores | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const runningRef = useRef(false);

  const run = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus("running");
    setReasoning("");
    setAnswer("");
    setScores(null);
    setReasoningOpen(true);

    try {
      const res = await fetch(`/api/django-stream/wealth/deals/${dealId}/deep-analysis`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok || !res.body) throw new Error(`Analysis request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/event:\s*(.+)/);
          const dataMatch = block.match(/data:\s*(.+)/);
          const eventName = eventMatch ? eventMatch[1].trim() : "message";
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(dataMatch ? dataMatch[1].trim() : "{}") as Record<string, unknown>;
          } catch {
            continue;
          }

          if (eventName === "reasoning") {
            setReasoning((prev) => prev + String(data.text || ""));
          } else if (eventName === "delta") {
            setAnswer((prev) => prev + String(data.text || ""));
          } else if (eventName === "scores") {
            setScores({
              scores: (data.scores as DeepAnalysisScores["scores"]) || {},
              verdict: String(data.verdict || ""),
              headline: String(data.headline || ""),
            });
          } else if (eventName === "done") {
            setReasoningOpen(false);
          }
        }
      }
      setStatus("done");
    } catch (e) {
      console.error("Deal deep-analysis failed:", e);
      setStatus("error");
    } finally {
      runningRef.current = false;
    }
  };

  // Strip the trailing JSON fence from the displayed verdict (it feeds the scores card).
  const displayAnswer = answer.replace(/```json[\s\S]*?(```|$)/, "").trimEnd();

  const verdictTone =
    scores?.verdict === "pursue"
      ? "text-emerald-400"
      : scores?.verdict === "pass"
        ? "text-rose-400"
        : "text-amber-400";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" aria-hidden />
            Sage Deep Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            Watch the reasoning model think through all 10 Investor Controls on this deal.
          </CardDescription>
        </div>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="ml-1">{status === "done" ? "Re-analyze" : "Analyze"}</span>
        </Button>
      </CardHeader>

      {status !== "idle" ? (
        <CardContent className="space-y-3">
          {status === "error" ? (
            <p className="text-sm text-destructive">
              The analysis could not be completed. Please try again.
            </p>
          ) : null}

          {reasoning ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5">
              <button
                type="button"
                onClick={() => setReasoningOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-400"
              >
                <span className="flex items-center gap-1.5">
                  {status === "running" && !displayAnswer ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : null}
                  Sage is thinking{status === "running" && !displayAnswer ? "…" : " (full trace)"}
                </span>
                {reasoningOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              {reasoningOpen ? (
                <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {reasoning}
                </p>
              ) : null}
            </div>
          ) : null}

          {displayAnswer ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-secondary-foreground">
              {displayAnswer}
            </p>
          ) : null}

          {scores ? (
            <div className="rounded-md border border-border bg-secondary/30 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-sm font-semibold uppercase ${verdictTone}`}>
                  {scores.verdict || "verdict"}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{scores.headline}</p>
              </div>
              {onApplyScores ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => onApplyScores(scores)}
                >
                  Apply AI scores
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

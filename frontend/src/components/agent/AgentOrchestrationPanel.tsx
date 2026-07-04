"use client";

import React from "react";
import { Check, Loader2, GitMerge, Wrench, Network } from "lucide-react";
import type { OrchestrationState } from "@/hooks/useAgentStream";
import { agentKeyToLabel } from "@/lib/agent-topics";

/**
 * Live multi-agent orchestration view for a single assistant turn:
 * routing decision -> specialist chips (queued / running / done + latency)
 * -> synthesis shimmer. Driven entirely by SSE lifecycle events.
 */
export function AgentOrchestrationPanel({
  orchestration,
  isStreaming,
}: {
  orchestration: OrchestrationState;
  isStreaming?: boolean;
}) {
  const { phase, intent, agents, toolCalls } = orchestration;
  if (!agents.length && !toolCalls.length) return null;

  const synthesizing = phase === "synthesis" && isStreaming;

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Network className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <span className="font-medium text-foreground">Agent team</span>
        {intent ? <span className="truncate">· {intent.replace(/_/g, " ")}</span> : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {agents.map((a) => (
          <span
            key={a.agent}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors ${
              a.status === "done"
                ? "bg-primary/10 border-primary/40 text-foreground"
                : a.status === "running"
                  ? "bg-background/60 border-primary/40 text-foreground"
                  : "bg-background/40 border-border text-muted-foreground"
            }`}
            title={a.frame || undefined}
          >
            {a.status === "running" ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" aria-hidden />
            ) : a.status === "done" ? (
              <Check className="w-3 h-3 text-primary shrink-0" aria-hidden />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" aria-hidden />
            )}
            {agentKeyToLabel(a.agent)}
            {a.status === "done" && a.ms ? (
              <span className="text-muted-foreground">{(a.ms / 1000).toFixed(1)}s</span>
            ) : null}
          </span>
        ))}
      </div>

      {toolCalls.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {toolCalls.map((t, i) => (
            <span
              key={`${t.name}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-background/40 text-[10px] text-muted-foreground"
            >
              <Wrench className="w-3 h-3 shrink-0" aria-hidden />
              {t.name.replace(/_/g, " ")}
              {t.kind === "write" ? <span className="text-primary">· needs confirm</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {synthesizing ? (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitMerge className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" aria-hidden />
          <span className="animate-pulse">Synthesizing one answer from the team…</span>
        </div>
      ) : null}
    </div>
  );
}

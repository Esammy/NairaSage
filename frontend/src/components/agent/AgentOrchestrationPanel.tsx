"use client";

import React from "react";
import { Check, Loader2, GitMerge, Wrench } from "lucide-react";
import type { OrchestrationState } from "@/hooks/useAgentStream";
import { agentKeyToLabel } from "@/lib/agent-topics";

/**
 * Compact Agent Society timeline for a single assistant turn:
 * routing → specialists (queued / running / done) → synthesis.
 * Driven by SSE lifecycle events.
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
  const allDone = agents.length > 0 && agents.every((a) => a.status === "done");

  return (
    <div
      className="rounded-lg border border-border/70 bg-surface-elevated px-3 py-2.5 text-xs"
      role="status"
      aria-label="Agent team progress"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <span className="font-medium text-foreground text-[11px] uppercase tracking-[0.1em]">
          Agent team
        </span>
        {intent ? (
          <span className="truncate text-muted-foreground">· {intent.replace(/_/g, " ")}</span>
        ) : null}
      </div>

      <ol className="space-y-1.5">
        {agents.map((a, i) => (
          <li key={a.agent} className="flex items-center gap-2.5">
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {i < agents.length - 1 || synthesizing || allDone ? (
                <span
                  className="absolute left-1/2 top-5 h-[calc(100%+2px)] w-px -translate-x-1/2 bg-border"
                  aria-hidden
                />
              ) : null}
              {a.status === "running" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" aria-hidden />
              ) : a.status === "done" ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="w-2.5 h-2.5" aria-hidden />
                </span>
              ) : (
                <span
                  className="h-2 w-2 rounded-full border border-muted-foreground/40 bg-transparent"
                  aria-hidden
                />
              )}
            </span>
            <span
              className={`flex-1 min-w-0 truncate ${
                a.status === "queued" ? "text-muted-foreground" : "text-foreground"
              }`}
              title={a.frame || undefined}
            >
              {agentKeyToLabel(a.agent)}
            </span>
            {a.status === "done" && a.ms ? (
              <span className="tabular-nums text-muted-foreground shrink-0">
                {(a.ms / 1000).toFixed(1)}s
              </span>
            ) : a.status === "running" ? (
              <span className="text-primary shrink-0 text-[10px]">working</span>
            ) : null}
          </li>
        ))}

        {synthesizing || (allDone && phase === "synthesis") ? (
          <li className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {synthesizing ? (
                <GitMerge className="w-3.5 h-3.5 text-primary animate-pulse" aria-hidden />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="w-2.5 h-2.5" aria-hidden />
                </span>
              )}
            </span>
            <span className={synthesizing ? "text-muted-foreground animate-pulse" : "text-foreground"}>
              {synthesizing ? "Synthesizing one answer…" : "Synthesized"}
            </span>
          </li>
        ) : null}
      </ol>

      {toolCalls.length > 0 ? (
        <ul className="mt-2 pt-2 border-t border-border/50 space-y-1">
          {toolCalls.map((t, i) => (
            <li
              key={`${t.name}-${i}`}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <Wrench className="w-3 h-3 shrink-0" aria-hidden />
              <span className="truncate">{t.name.replace(/_/g, " ")}</span>
              {t.kind === "write" ? (
                <span className="text-primary shrink-0">needs confirm</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

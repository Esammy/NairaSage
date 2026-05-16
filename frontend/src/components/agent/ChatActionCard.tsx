"use client";

import React, { useState } from "react";
import { Check, Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatActionState, ChatActionStatus } from "@/hooks/useAgentStream";

function summarizeDiff(diff: Record<string, unknown>) {
  const before = diff.before;
  const after = diff.after_preview;
  if (before && typeof before === "object" && after && typeof after === "object") {
    return { before, after };
  }
  return { before: null, after: after ?? null };
}

export function ChatActionCard({
  action,
  onResolved,
}: {
  action: ChatActionState;
  onResolved: (id: number, status: ChatActionStatus, error?: string) => void;
}) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState(() => JSON.stringify(action.args, null, 2));

  const { before, after } = summarizeDiff(action.diff_preview);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    let detail = "";
    try {
      const j = (await res.json()) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* ignore */
    }
    return { ok: res.ok, detail: detail || `Request failed (${res.status})` };
  }

  const confirm = async () => {
    setBusy("confirm");
    try {
      let argsOverride: Record<string, unknown> | undefined;
      if (editing) {
        try {
          const parsed = JSON.parse(editJson) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            onResolved(action.id, "failed", "Args must be a JSON object.");
            setBusy(null);
            return;
          }
          argsOverride = parsed as Record<string, unknown>;
        } catch {
          onResolved(action.id, "failed", "Invalid JSON in edited args.");
          setBusy(null);
          return;
        }
      }
      const { ok, detail } = await postJson(
        `/api/django/wealth/actions/${action.id}/confirm/`,
        argsOverride ? { args: argsOverride } : {}
      );
      if (ok) onResolved(action.id, "applied");
      else onResolved(action.id, "failed", detail);
    } catch (e) {
      onResolved(
        action.id,
        "failed",
        e instanceof Error ? e.message : "Confirm failed"
      );
    } finally {
      setBusy(null);
      setEditing(false);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const { ok, detail } = await postJson(
        `/api/django/wealth/actions/${action.id}/cancel/`,
        {}
      );
      if (ok) onResolved(action.id, "cancelled");
      else onResolved(action.id, "failed", detail);
    } catch (e) {
      onResolved(
        action.id,
        "failed",
        e instanceof Error ? e.message : "Cancel failed"
      );
    } finally {
      setBusy(null);
    }
  };

  const statusLabel =
    action.status === "applied"
      ? "Applied"
      : action.status === "cancelled"
        ? "Cancelled"
        : action.status === "failed"
          ? "Failed"
          : "Pending confirmation";

  const borderClass =
    action.status === "failed"
      ? "border-destructive/60"
      : action.status === "applied"
        ? "border-emerald-500/50"
        : action.status === "cancelled"
          ? "border-muted-foreground/40"
          : "border-primary/40";

  return (
    <div
      className={`rounded-xl border bg-card/80 p-3 text-sm max-w-[90%] sm:max-w-[85%] ${borderClass}`}
      role="region"
      aria-label={`Action proposal ${action.tool}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {statusLabel}
          </div>
          <p className="text-foreground mt-1">{action.human_summary}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{action.tool}</p>
        </div>
      </div>

      {(before || after) && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-muted/40 p-2 overflow-x-auto max-h-32 overflow-y-auto">
            <div className="font-medium text-muted-foreground mb-1">Before</div>
            <pre className="whitespace-pre-wrap break-all">
              {before ? JSON.stringify(before, null, 2) : "—"}
            </pre>
          </div>
          <div className="rounded-md bg-muted/40 p-2 overflow-x-auto max-h-32 overflow-y-auto">
            <div className="font-medium text-muted-foreground mb-1">After preview</div>
            <pre className="whitespace-pre-wrap break-all">
              {after ? JSON.stringify(after, null, 2) : "—"}
            </pre>
          </div>
        </div>
      )}

      {editing && action.status === "pending" && (
        <label className="block mt-2">
          <span className="text-xs text-muted-foreground">Edit args (JSON)</span>
          <textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            className="mt-1 w-full min-h-[120px] rounded-md border border-border bg-background p-2 font-mono text-xs"
          />
        </label>
      )}

      {action.error && (
        <p className="text-xs text-destructive mt-2">{action.error}</p>
      )}

      {action.status === "pending" && (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            type="button"
            size="sm"
            onClick={() => void confirm()}
            disabled={busy !== null}
            className="gap-1"
          >
            {busy === "confirm" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Confirm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(!editing)}
            disabled={busy !== null}
            className="gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void cancel()}
            disabled={busy !== null}
            className="gap-1 text-muted-foreground"
          >
            {busy === "cancel" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

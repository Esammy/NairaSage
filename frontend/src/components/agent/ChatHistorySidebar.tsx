"use client";

import React from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CoachSessionMeta } from "@/hooks/usePersistentCoachSession";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatHistorySidebar({
  sessions,
  activeId,
  onNewChat,
  onSelect,
  busy,
  className,
}: {
  sessions: CoachSessionMeta[];
  activeId: number | null;
  onNewChat: () => void;
  onSelect: (id: number) => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="p-3 shrink-0">
        <Button
          type="button"
          onClick={onNewChat}
          disabled={busy}
          className="w-full justify-start gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      <div className="px-3 pb-1 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 min-h-0">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No conversations yet. Your chats will appear here.
          </p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "w-full text-left rounded-md px-2.5 py-2 transition-colors flex items-start gap-2 group",
                s.id === activeId
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
              aria-current={s.id === activeId ? "true" : undefined}
            >
              <MessageSquare
                className={cn(
                  "h-3.5 w-3.5 mt-0.5 shrink-0",
                  s.id === activeId ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight">{s.title || "New chat"}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {relativeTime(s.updated_at)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

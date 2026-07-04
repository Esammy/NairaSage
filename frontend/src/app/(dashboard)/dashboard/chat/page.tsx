"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, Loader2, MessageSquarePlus, PanelLeft } from "lucide-react";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { useAgentStream } from "@/hooks/useAgentStream";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { unwrapResults } from "@/lib/django-api";
import { useChatSessionStore } from "@/lib/chat-session-store";

type ChatSessionRow = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

type SessionListBody = {
  next?: string | null;
  results?: ChatSessionRow[];
};

export default function DashboardChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [booting, setBooting] = useState(true);
  /** Chats + New chat column (collapsible on all screen sizes). */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatBackendError, setChatBackendError] = useState<string | null>(null);

  const createInFlight = useRef<Promise<ChatSessionRow> | null>(null);
  const setCoordinatorSessionId = useChatSessionStore((s) => s.setCoordinatorSessionId);

  const refetchSessionHead = useCallback(async () => {
    const res = await fetch("/api/django/agent/chat-sessions/?page=1", {
      credentials: "include",
    });
    if (!res.ok) return;
    const body = (await res.json()) as SessionListBody;
    setSessions(unwrapResults<ChatSessionRow>(body));
    setHasMoreSessions(Boolean(body.next));
    setSessionPage(1);
  }, []);

  const { messages, sendMessage, isTyping, resetToWelcome, hydrateFromOutcomes, resolveChatAction } =
    useAgentStream({
      sessionId: activeSessionId,
      onTurnComplete: refetchSessionHead,
    });

  const postNewSession = useCallback(async (): Promise<ChatSessionRow> => {
    if (!createInFlight.current) {
      createInFlight.current = (async () => {
        const res = await fetch("/api/django/agent/chat-sessions/", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) throw new Error("Could not start a new chat");
        return res.json() as Promise<ChatSessionRow>;
      })().finally(() => {
        createInFlight.current = null;
      });
    }
    return createInFlight.current;
  }, []);

  const loadSessionDetail = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/django/agent/chat-sessions/${id}/`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      hydrateFromOutcomes(data.outcomes || []);
    },
    [hydrateFromOutcomes]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      try {
        const res = await fetch("/api/django/agent/chat-sessions/?page=1", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setChatBackendError(
            "Chat history could not load. On the server, run: python manage.py migrate"
          );
          return;
        }
        setChatBackendError(null);
        const body = (await res.json()) as SessionListBody;
        const rows = unwrapResults<ChatSessionRow>(body);
        if (cancelled) return;
        setHasMoreSessions(Boolean(body.next));
        if (rows.length > 0) {
          setSessions(rows);
          const first = rows[0];
          setActiveSessionId(first.id);
          await loadSessionDetail(first.id);
        } else {
          const created = await postNewSession();
          if (cancelled) return;
          setSessions([created]);
          setActiveSessionId(created.id);
          resetToWelcome();
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setChatBackendError(
            "Could not start chat storage. Run database migrations on the backend, then refresh this page."
          );
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSessionDetail, postNewSession, resetToWelcome]);

  const loadMoreSessions = async () => {
    if (!hasMoreSessions || loadingSessions) return;
    setLoadingSessions(true);
    try {
      const nextPage = sessionPage + 1;
      const res = await fetch(`/api/django/agent/chat-sessions/?page=${nextPage}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const body = (await res.json()) as SessionListBody;
      const rows = unwrapResults<ChatSessionRow>(body);
      setSessions((prev) => [...prev, ...rows]);
      setSessionPage(nextPage);
      setHasMoreSessions(Boolean(body.next));
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleNewChat = async () => {
    if (isTyping) return;
    setChatBackendError(null);
    try {
      const row = await postNewSession();
      setSessions((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
      setActiveSessionId(row.id);
      resetToWelcome();
    } catch (e) {
      console.error(e);
      setChatBackendError(
        "New chat failed (often missing DB table). In backend: python manage.py migrate — then try again."
      );
    }
  };

  const handleSelectSession = async (id: number) => {
    if (isTyping || id === activeSessionId) return;
    setActiveSessionId(id);
    await loadSessionDetail(id);
  };

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping || booting) return;
      void sendMessage(text);
    },
    [sendMessage, isTyping, booting]
  );

  const formatSessionWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground">
            Conversations are saved automatically. Open a past chat from the left or start fresh.
          </p>
          {chatBackendError && (
            <p
              role="alert"
              className="mt-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
            >
              {chatBackendError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
            aria-controls="chat-history-panel"
          >
            {historyOpen ? (
              <>
                <ChevronsLeft className="mr-2 h-4 w-4" />
                Hide chats
              </>
            ) : (
              <>
                <ChevronsRight className="mr-2 h-4 w-4" />
                Show chats
              </>
            )}
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to dashboard
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-[calc(100dvh-220px)] flex-col gap-0 lg:flex-row lg:items-stretch lg:rounded-2xl lg:border lg:border-border lg:overflow-hidden lg:bg-card/20"
        )}
      >
        {/* Session list + new chat */}
        {historyOpen && (
          <aside
            id="chat-history-panel"
            className="flex w-full shrink-0 flex-col border-b border-border bg-card/40 lg:w-72 lg:border-b-0 lg:border-r lg:bg-sidebar/80"
          >
            <div className="flex items-center gap-1 border-b border-border/60 p-2 sm:p-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setHistoryOpen(false)}
                aria-label="Collapse chat list"
                title="Collapse"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">Chats</span>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 shrink-0 gap-1 px-2 sm:px-3"
                onClick={() => void handleNewChat()}
                disabled={isTyping || booting}
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {booting ? (
                <div className="space-y-2 p-2" aria-busy="true">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-4/5" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                sessions.map((s) => {
                  const active = s.id === activeSessionId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => void handleSelectSession(s.id)}
                      disabled={isTyping}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <div className="font-medium line-clamp-2 text-foreground">{s.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatSessionWhen(s.updated_at)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {hasMoreSessions && (
              <div className="border-t border-border/60 p-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={loadingSessions}
                  onClick={() => void loadMoreSessions()}
                >
                  {loadingSessions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Load older chats"
                  )}
                </Button>
              </div>
            )}
            </div>
          </aside>
        )}

        {/* Collapsed rail + main transcript */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          {!historyOpen && (
            <button
              type="button"
              title="Expand chats and history"
              aria-label="Expand chats and message history"
              aria-expanded="false"
              aria-controls="chat-history-panel"
              onClick={() => setHistoryOpen(true)}
              className="flex w-11 shrink-0 flex-col items-center gap-3 border-b border-border bg-card/70 py-4 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground lg:border-b-0 lg:border-r"
            >
              <PanelLeft className="h-5 w-5" />
              <span
                className="select-none text-[10px] font-semibold uppercase tracking-widest text-center leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Chats
              </span>
            </button>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {booting ? (
            <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-dashed border-border p-8" aria-busy="true">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full max-w-md" />
            </div>
          ) : (
            <NairaSageChatPanel
              variant="full"
              title="NairaSage"
              subtitle={
                activeSessionId
                  ? sessions.find((s) => s.id === activeSessionId)?.title || "Personal finance co-pilot"
                  : "Personal finance co-pilot"
              }
              messages={messages}
              onSend={handleSend}
              onStop={stopStreaming}
              isTyping={isTyping}
              disabled={booting || isTyping}
              resolveChatAction={resolveChatAction}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

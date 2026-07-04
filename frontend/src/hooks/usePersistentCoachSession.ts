"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { OutcomeTurn } from "@/hooks/useAgentStream";

const STORAGE_KEY = "ns_coach_session_id";

export type CoachSessionMeta = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

/**
 * Keeps the coach conversation alive across reloads (and between the quick-chat
 * drawer and the full Wealth chat, which share one session), and lets the user
 * start a new chat or reopen a previous one.
 *
 * On mount it loads the user's thread list, then hydrates the stored (or newest)
 * session's transcript; if the user has none it creates a fresh one. The session
 * id is the persisted server-side CoordinatorChatSession.
 *
 * `hydrateRef` holds useAgentStream's hydrateFromOutcomes — passed by ref so the
 * hook can own sessionId state without a render cycle against useAgentStream.
 */
export function usePersistentCoachSession(
  hydrateRef: MutableRefObject<(outcomes: OutcomeTurn[]) => void>
) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<CoachSessionMeta[]>([]);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/django/agent/chat-sessions/", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const rows: CoachSessionMeta[] = Array.isArray(data) ? data : data.results || [];
        setSessions(rows);
        return rows;
      }
    } catch {
      /* offline — leave the list as-is */
    }
    return null;
  }, []);

  const hydrateSession = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const res = await fetch(`/api/django/agent/chat-sessions/${id}/`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(id));
          hydrateRef.current(data.outcomes || []);
          return true;
        }
      } catch {
        /* fall through */
      }
      return false;
    },
    [hydrateRef]
  );

  const createSession = useCallback(async (): Promise<number | null> => {
    try {
      const created = await fetch("/api/django/agent/chat-sessions/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (created.ok) {
        const row = await created.json();
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(row.id));
        setSessionId(row.id);
        return row.id;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        const rows = await refresh();
        if (cancelled) return;

        const stored =
          typeof window !== "undefined" ? Number(localStorage.getItem(STORAGE_KEY) || 0) : 0;
        const storedExists = !!rows?.some((r) => r.id === stored);

        if (stored && storedExists) {
          const ok = await hydrateSession(stored);
          if (ok) return;
        }
        // No valid stored id — reopen the most recent thread if any, else create one.
        if (rows && rows.length > 0) {
          const ok = await hydrateSession(rows[0].id);
          if (ok) return;
        }
        if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
        await createSession();
        await refresh();
      } catch {
        /* offline / backend down — chat still works, just without persistence */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh, hydrateSession, createSession]);

  /** Start a fresh empty conversation and switch the transcript to it. */
  const startNewSession = useCallback(async (): Promise<number | null> => {
    const id = await createSession();
    if (id) {
      hydrateRef.current([]); // clear the transcript for the new thread
      await refresh();
    }
    return id;
  }, [createSession, hydrateRef, refresh]);

  /** Reopen a previous conversation by id, hydrating its transcript. */
  const openSession = useCallback(
    async (id: number): Promise<boolean> => {
      if (id === sessionId) return true;
      return hydrateSession(id);
    },
    [sessionId, hydrateSession]
  );

  return {
    sessionId,
    sessions,
    ready,
    startNewSession,
    openSession,
    refreshSessions: refresh,
  };
}

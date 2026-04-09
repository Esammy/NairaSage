"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import api from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type StreamPayload = {
  delta?: string;
  text?: string;
  message?: string;
  done?: boolean;
};

type ConversationRow = {
  id: number;
  user_query: string;
  assistant_response?: string;
};

function rowsToMessages(rows: ConversationRow[]): ChatMessage[] {
  const chronological = [...rows].reverse();
  const msgs: ChatMessage[] = [];
  for (const row of chronological) {
    msgs.push({ id: `u-${row.id}`, role: "user", text: row.user_query || "" });
    msgs.push({
      id: `a-${row.id}`,
      role: "agent",
      text: row.assistant_response || "",
    });
  }
  return msgs;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRetryText = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/agent/conversations/", { params: { page_size: 40 } });
        const raw = res.data?.results ?? res.data;
        if (!Array.isArray(raw) || cancelled) return;
        setMessages(rowsToMessages(raw as ConversationRow[]));
      } catch {
        /* guest or network — keep empty */
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLastError(null);
    pendingRetryText.current = trimmed;

    const userMsg: ChatMessage = { id: String(Date.now()), role: "user", text: trimmed };
    setMessages((s) => [...s, userMsg]);

    const token = getAccessToken();
    const streamUrl = `${API_BASE}/api/agent/chat/stream/`;
    const agentMessageId = `${Date.now()}-agent`;

    try {
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let aggregatedText = "";

      setMessages((prev) => [...prev, { id: agentMessageId, role: "agent", text: "" }]);

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let currentEvent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const frames = pending.split("\n\n");
        pending = frames.pop() || "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice("event:".length).trim();
            }
            if (line.startsWith("data:")) {
              eventData += line.slice("data:".length).trim();
            }
          }

          if (!eventData) continue;

          let payload: StreamPayload | string = eventData;
          try {
            payload = JSON.parse(eventData) as StreamPayload;
          } catch {
            payload = eventData;
          }

          const delta =
            (typeof payload === "object" && (payload?.delta || payload?.text || payload?.message)) ||
            (typeof payload === "string" ? payload : "");
          const hasStreamChunk =
            currentEvent === "delta" ||
            (typeof payload === "object" && Boolean(payload?.delta || payload?.text));

          if (hasStreamChunk) {
            aggregatedText += delta;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId ? { ...msg, text: aggregatedText } : msg
              )
            );
          }

          if (currentEvent === "done" || (typeof payload === "object" && payload?.done === true)) {
            setStreaming(false);
            abortRef.current = null;
          }
        }
      }
      setStreaming(false);
      abortRef.current = null;
      pendingRetryText.current = null;
    } catch {
      try {
        const res = await api.post("/agent/chat/", { message: trimmed });
        const fallbackText = res.data?.response || res.data?.text || "Response received.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId ? { ...msg, text: String(fallbackText) } : msg
          )
        );
        pendingRetryText.current = null;
      } catch {
        const errMsg = "Unable to reach the coordinator. Check your connection and try again.";
        setLastError(errMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId ? { ...msg, text: errMsg } : msg
          )
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    }
  }, []);

  const retryLast = useCallback(() => {
    const t = pendingRetryText.current;
    if (!t || !lastError) return;
    setLastError(null);
    setMessages((prev) => {
      const next = [...prev];
      if (
        next.length >= 2 &&
        next[next.length - 2]?.role === "user" &&
        next[next.length - 2]?.text === t &&
        next[next.length - 1]?.role === "agent"
      ) {
        next.pop();
        next.pop();
      }
      return next;
    });
    void sendMessage(t);
  }, [sendMessage, lastError]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return {
    messages,
    sendMessage,
    streaming,
    stopStream,
    clear,
    setMessages,
    historyLoaded,
    lastError,
    retryLast,
    canRetry: Boolean(lastError),
  } as const;
}

export default useChat;

import { useState, useCallback, useRef, useEffect } from "react";
import { agentKeysToTopics } from "@/lib/agent-topics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  topics?: string[];
  isStreaming?: boolean;
  isThinking?: boolean;
  isError?: boolean;
}

function emptyThread(): ChatMessage[] {
  return [];
}

export type OutcomeTurn = {
  id: number;
  user_query: string;
  assistant_response: string;
  agents_called?: string[];
};

export type UseAgentStreamOptions = {
  sessionId?: number | null;
  onTurnComplete?: () => void;
};

function findPreviousUserText(messages: ChatMessage[], assistantId: string): string | null {
  const idx = messages.findIndex((m) => m.id === assistantId);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return null;
}

export function useAgentStream(options?: UseAgentStreamOptions) {
  const sessionId = options?.sessionId ?? null;
  const onTurnComplete = options?.onTurnComplete;

  const [messages, setMessages] = useState<ChatMessage[]>(() => emptyThread());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isTyping, setIsTyping] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pendingDeltaRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const flushAssistantIdRef = useRef<string | null>(null);

  const flushPendingDelta = useCallback(() => {
    const assistantMessageId = flushAssistantIdRef.current;
    if (!assistantMessageId) {
      rafRef.current = null;
      return;
    }
    const chunk = pendingDeltaRef.current;
    pendingDeltaRef.current = "";
    rafRef.current = null;
    if (!chunk) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessageId
          ? { ...m, content: m.content + chunk, isThinking: false }
          : m
      )
    );
  }, []);

  const appendDelta = useCallback(
    (assistantMessageId: string, text: string) => {
      if (!text) return;
      flushAssistantIdRef.current = assistantMessageId;
      pendingDeltaRef.current += text;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          flushPendingDelta();
        });
      }
    },
    [flushPendingDelta]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const resetToWelcome = useCallback(() => {
    setMessages(emptyThread());
  }, []);

  const hydrateFromOutcomes = useCallback((outcomes: OutcomeTurn[]) => {
    if (!outcomes.length) {
      setMessages(emptyThread());
      return;
    }
    const built: ChatMessage[] = [];
    for (const o of outcomes) {
      built.push({
        id: `hist-u-${o.id}`,
        role: "user",
        content: o.user_query,
      });
      built.push({
        id: `hist-a-${o.id}`,
        role: "assistant",
        content: o.assistant_response,
        topics: agentKeysToTopics(o.agents_called || []),
      });
    }
    setMessages(built);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runSseStream = useCallback(
    async (userText: string, assistantMessageId: string, signal: AbortSignal) => {
      const payload =
        sessionId != null
          ? { message: userText, session_id: sessionId }
          : { message: userText };

      const res = await fetch("/api/agent/stream", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok || !res.body) {
        let detail = "Stream connection failed";
        try {
          const errJson = (await res.json()) as { detail?: unknown; error?: unknown };
          if (typeof errJson.detail === "string") detail = errJson.detail;
          else if (Array.isArray(errJson.detail))
            detail = errJson.detail.map((x) => String(x)).join(" ");
          else if (typeof errJson.error === "string") detail = errJson.error;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const block of parts) {
            if (!block.trim()) continue;

            const eventMatch = block.match(/event:\s*(.+)/);
            const dataMatch = block.match(/data:\s*(.+)/);

            const eventName = eventMatch ? eventMatch[1].trim() : "message";
            const dataRaw = dataMatch ? dataMatch[1].trim() : "{}";

            let data: Record<string, unknown> = {};
            try {
              data = JSON.parse(dataRaw) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (eventName === "meta") {
              const agentsUsed = (data.agents_used as string[]) || [];
              const topics = agentKeysToTopics(agentsUsed);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, topics, isThinking: false }
                    : m
                )
              );
            } else if (eventName === "status") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, isThinking: false } : m
                )
              );
            } else if (eventName === "delta") {
              const chunk = (data.text as string) || "";
              appendDelta(assistantMessageId, chunk);
            } else if (eventName === "done") {
              flushPendingDelta();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, isStreaming: false, isThinking: false }
                    : m
                )
              );
            }
          }
        }
      }
      flushPendingDelta();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false, isThinking: false }
            : m
        )
      );
    },
    [sessionId, appendDelta, flushPendingDelta]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessageId = Date.now().toString();
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: "user", content: text },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          isStreaming: true,
          isThinking: true,
        },
      ]);

      setIsTyping(true);
      pendingDeltaRef.current = "";
      flushAssistantIdRef.current = assistantMessageId;
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        await runSseStream(text.trim(), assistantMessageId, ac.signal);
        onTurnComplete?.();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, isStreaming: false, isThinking: false }
                : m
            )
          );
          return;
        }
        console.error("Agent Stream Error:", err);
        flushPendingDelta();
        const msg =
          err instanceof Error ? err.message : "Request failed. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: msg,
                  isStreaming: false,
                  isThinking: false,
                  isError: true,
                }
              : m
          )
        );
      } finally {
        abortRef.current = null;
        setIsTyping(false);
      }
    },
    [runSseStream, onTurnComplete, flushPendingDelta]
  );

  const retryAssistantMessage = useCallback(
    async (assistantMessageId: string) => {
      const userText = findPreviousUserText(messagesRef.current, assistantMessageId);
      if (!userText) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: "",
                isStreaming: true,
                isThinking: true,
                isError: false,
                topics: undefined,
              }
            : m
        )
      );

      setIsTyping(true);
      pendingDeltaRef.current = "";
      flushAssistantIdRef.current = assistantMessageId;
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        await runSseStream(userText.trim(), assistantMessageId, ac.signal);
        onTurnComplete?.();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, isStreaming: false, isThinking: false }
                : m
            )
          );
          return;
        }
        console.error("Agent Stream Error:", err);
        flushPendingDelta();
        const msg =
          err instanceof Error ? err.message : "Request failed. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: msg,
                  isStreaming: false,
                  isThinking: false,
                  isError: true,
                }
              : m
          )
        );
      } finally {
        abortRef.current = null;
        setIsTyping(false);
      }
    },
    [runSseStream, onTurnComplete, flushPendingDelta]
  );

  const regenerateAssistantMessage = useCallback(
    async (assistantMessageId: string) => {
      await retryAssistantMessage(assistantMessageId);
    },
    [retryAssistantMessage]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    isTyping,
    resetToWelcome,
    hydrateFromOutcomes,
    stopStreaming,
    retryAssistantMessage,
    regenerateAssistantMessage,
  };
}

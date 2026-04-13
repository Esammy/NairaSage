import { useState, useCallback } from "react";
import { agentKeysToTopics } from "@/lib/agent-topics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** User-facing topic labels derived from routing (never raw agent keys). */
  topics?: string[];
  isStreaming?: boolean;
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
  /** When set, streamed turns are stored against this chat session on the server. */
  sessionId?: number | null;
  /** Called after a streamed reply finishes successfully (refresh session list, etc.). */
  onTurnComplete?: () => void;
};

export function useAgentStream(options?: UseAgentStreamOptions) {
  const sessionId = options?.sessionId ?? null;
  const onTurnComplete = options?.onTurnComplete;

  const [messages, setMessages] = useState<ChatMessage[]>(() => emptyThread());
  const [isTyping, setIsTyping] = useState(false);

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

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessageId = Date.now().toString();
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages((prev) => [...prev, { id: userMessageId, role: "user", content: text }]);

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "", isStreaming: true },
      ]);

      setIsTyping(true);

      try {
        const payload =
          sessionId != null
            ? { message: text, session_id: sessionId }
            : { message: text };

        const res = await fetch("/api/agent/stream", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

        let agentsUsed: string[] = [];

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
                agentsUsed = (data.agents_used as string[]) || [];
                const topics = agentKeysToTopics(agentsUsed);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, topics } : m
                  )
                );
              } else if (eventName === "delta") {
                const chunk = (data.text as string) || "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk }
                      : m
                  )
                );
              } else if (eventName === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, isStreaming: false } : m
                  )
                );
              }
            }
          }
        }
        onTurnComplete?.();
      } catch (err) {
        console.error("Agent Stream Error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    "I could not reach NairaSage just now. Please check your connection and try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, onTurnComplete]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    isTyping,
    resetToWelcome,
    hydrateFromOutcomes,
  };
}

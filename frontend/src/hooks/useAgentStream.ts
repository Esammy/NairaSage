import { useState, useCallback, useRef, useEffect } from "react";
import { agentKeysToTopics } from "@/lib/agent-topics";

export type ChatActionStatus = "pending" | "applied" | "cancelled" | "failed";

export type ChatActionState = {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  human_summary: string;
  diff_preview: Record<string, unknown>;
  status: ChatActionStatus;
  error?: string;
};

export type ActionStripItem = {
  id: number;
  human_summary: string;
  status: ChatActionStatus;
  error?: string;
};

export type OrchestrationAgentStatus = "queued" | "running" | "done";

export type OrchestrationAgent = {
  agent: string;
  frame?: string;
  status: OrchestrationAgentStatus;
  ms?: number;
  confidence?: number;
};

export type OrchestrationPhase = "routing" | "agents" | "synthesis" | "done";

export type OrchestrationState = {
  phase: OrchestrationPhase;
  intent?: string;
  agents: OrchestrationAgent[];
  toolCalls: { name: string; kind: "read" | "write" }[];
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  topics?: string[];
  isStreaming?: boolean;
  isThinking?: boolean;
  isError?: boolean;
  actions?: ChatActionState[];
  orchestration?: OrchestrationState;
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
  /** Fired once per assistant reply when streaming begins (after placeholder message exists). */
  onAssistantStreamStart?: (messageId: string) => void;
  /** Each SSE text delta from the model (for streaming TTS, etc.). */
  onAssistantDelta?: (payload: { messageId: string; delta: string }) => void;
  /** Fired when the assistant message finishes streaming (`done` event). */
  onAssistantStreamEnd?: (messageId: string) => void;
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
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const sessionId = options?.sessionId ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>(() => emptyThread());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isTyping, setIsTyping] = useState(false);
  const [actionStrip, setActionStrip] = useState<ActionStripItem[]>([]);

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
    setActionStrip([]);
  }, []);

  const resolveChatAction = useCallback(
    (id: number, status: ChatActionStatus, error?: string) => {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          actions: m.actions?.map((a) =>
            a.id === id ? { ...a, status, error } : a
          ),
        }))
      );
      setActionStrip((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, status, error } : row
        )
      );
    },
    []
  );

  const hydrateFromOutcomes = useCallback((outcomes: OutcomeTurn[]) => {
    if (!outcomes.length) {
      setMessages(emptyThread());
      setActionStrip([]);
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
    setActionStrip([]);
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
      let streamStarted = false;

      const patchOrchestration = (fn: (o: OrchestrationState) => OrchestrationState) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  orchestration: fn(
                    m.orchestration || {
                      phase: "routing",
                      agents: [],
                      toolCalls: [],
                    }
                  ),
                }
              : m
          )
        );
      };

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

            if (eventName === "routing") {
              const routed = (data.agents as { agent: string; frame?: string }[]) || [];
              patchOrchestration((o) => ({
                ...o,
                phase: "agents",
                intent: String(data.intent || ""),
                agents: routed.map((a) => ({ ...a, status: "queued" as const })),
              }));
            } else if (eventName === "agent_started") {
              const agent = String(data.agent || "");
              patchOrchestration((o) => ({
                ...o,
                agents: o.agents.some((a) => a.agent === agent)
                  ? o.agents.map((a) =>
                      a.agent === agent ? { ...a, status: "running" as const } : a
                    )
                  : [
                      ...o.agents,
                      {
                        agent,
                        frame: String(data.frame || ""),
                        status: "running" as const,
                      },
                    ],
              }));
            } else if (eventName === "agent_finished") {
              const agent = String(data.agent || "");
              patchOrchestration((o) => ({
                ...o,
                agents: o.agents.map((a) =>
                  a.agent === agent
                    ? {
                        ...a,
                        status: "done" as const,
                        ms: Number(data.ms) || undefined,
                        confidence: Number(data.confidence) || undefined,
                      }
                    : a
                ),
              }));
            } else if (eventName === "synthesis_started") {
              patchOrchestration((o) => ({ ...o, phase: "synthesis" }));
            } else if (eventName === "tool_call") {
              patchOrchestration((o) => ({
                ...o,
                toolCalls: [
                  ...o.toolCalls,
                  {
                    name: String(data.name || ""),
                    kind: data.kind === "write" ? "write" : "read",
                  },
                ],
              }));
            } else if (eventName === "meta") {
              if (!streamStarted) {
                streamStarted = true;
                optsRef.current?.onAssistantStreamStart?.(assistantMessageId);
              }
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
              if (!streamStarted) {
                streamStarted = true;
                optsRef.current?.onAssistantStreamStart?.(assistantMessageId);
              }
              const chunk = (data.text as string) || "";
              if (chunk) {
                optsRef.current?.onAssistantDelta?.({
                  messageId: assistantMessageId,
                  delta: chunk,
                });
                appendDelta(assistantMessageId, chunk);
              }
            } else if (eventName === "action_proposal") {
              const id = Number(data.id);
              if (!Number.isFinite(id)) continue;
              const item: ChatActionState = {
                id,
                tool: String(data.tool || ""),
                args: (data.args as Record<string, unknown>) || {},
                human_summary: String(data.human_summary || ""),
                diff_preview: (data.diff_preview as Record<string, unknown>) || {},
                status: "pending",
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, actions: [...(m.actions || []), item] }
                    : m
                )
              );
              setActionStrip((prev) => [
                ...prev.filter((x) => x.id !== id),
                {
                  id,
                  human_summary: item.human_summary,
                  status: "pending",
                },
              ]);
            } else if (eventName === "done") {
              flushPendingDelta();
              optsRef.current?.onAssistantStreamEnd?.(assistantMessageId);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        isStreaming: false,
                        isThinking: false,
                        orchestration: m.orchestration
                          ? { ...m.orchestration, phase: "done" }
                          : m.orchestration,
                      }
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
            ? {
                ...m,
                isStreaming: false,
                isThinking: false,
                orchestration: m.orchestration
                  ? { ...m.orchestration, phase: "done" }
                  : m.orchestration,
              }
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
        optsRef.current?.onTurnComplete?.();
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
    [runSseStream, flushPendingDelta]
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
                actions: undefined,
                orchestration: undefined,
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
        optsRef.current?.onTurnComplete?.();
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
    [runSseStream, flushPendingDelta]
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
    actionStrip,
    resolveChatAction,
  };
}

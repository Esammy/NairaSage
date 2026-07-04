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

export function useAgentStream(options?: UseAgentStreamOptions) {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const sessionId = options?.sessionId ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>(() => emptyThread());
  const [isTyping, setIsTyping] = useState(false);
  const [actionStrip, setActionStrip] = useState<ActionStripItem[]>([]);

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

              const patchOrchestration = (
                fn: (o: OrchestrationState) => OrchestrationState
              ) => {
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
                optsRef.current?.onAssistantStreamStart?.(assistantMessageId);
                agentsUsed = (data.agents_used as string[]) || [];
                const topics = agentKeysToTopics(agentsUsed);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, topics } : m
                  )
                );
              } else if (eventName === "delta") {
                const chunk = (data.text as string) || "";
                optsRef.current?.onAssistantDelta?.({
                  messageId: assistantMessageId,
                  delta: chunk,
                });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk }
                      : m
                  )
                );
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
                optsRef.current?.onAssistantStreamEnd?.(assistantMessageId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          isStreaming: false,
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
        optsRef.current?.onTurnComplete?.();
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
    [sessionId]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    isTyping,
    resetToWelcome,
    hydrateFromOutcomes,
    actionStrip,
    resolveChatAction,
  };
}

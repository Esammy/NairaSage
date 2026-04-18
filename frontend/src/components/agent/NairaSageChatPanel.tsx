"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Bot } from "lucide-react";
import type { ChatMessage } from "@/hooks/useAgentStream";
import { MessageBubble } from "@/components/agent/MessageBubble";
import { ChatComposer } from "@/components/agent/ChatComposer";

type Variant = "drawer" | "full";

export function NairaSageChatPanel({
  variant,
  title = "NairaSage",
  subtitle = "Ask anything money-related",
  messages,
  onSend,
  onStop,
  isTyping,
  disabled,
  headerActions,
  retryAssistantMessage,
  regenerateAssistantMessage,
}: {
  variant: Variant;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onStop: () => void;
  isTyping: boolean;
  disabled?: boolean;
  headerActions?: React.ReactNode;
  retryAssistantMessage: (id: string) => void;
  regenerateAssistantMessage: (id: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const shellClass =
    variant === "full"
      ? "flex flex-col h-[min(720px,calc(100dvh-220px))] min-h-[420px] w-full glass-panel rounded-2xl border border-border overflow-hidden shadow-xl lg:rounded-none lg:border-0 lg:shadow-none"
      : "flex flex-col h-full min-h-0 overflow-hidden";

  const onRetry = useCallback(
    (id: string) => {
      void retryAssistantMessage(id);
    },
    [retryAssistantMessage]
  );

  const onRegen = useCallback(
    (id: string) => {
      void regenerateAssistantMessage(id);
    },
    [regenerateAssistantMessage]
  );

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/20 p-2 rounded-xl shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        {headerActions}
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10 px-4 max-w-md mx-auto">
            No messages yet — type below and send. Replies stay short and skip the intro unless
            you ask who NairaSage is.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onRetry={msg.role === "assistant" ? onRetry : undefined}
            onRegenerate={msg.role === "assistant" ? onRegen : undefined}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 shrink-0">
        <ChatComposer
          onSend={onSend}
          onStop={onStop}
          disabled={disabled}
          isStreaming={isTyping}
        />
      </div>
    </div>
  );
}

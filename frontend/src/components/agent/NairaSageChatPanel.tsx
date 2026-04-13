"use client";

import React, { useRef, useEffect } from "react";
import { Send, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/useAgentStream";

type Variant = "drawer" | "full";

export function NairaSageChatPanel({
  variant,
  title = "NairaSage",
  subtitle = "Ask anything money-related",
  messages,
  input,
  setInput,
  onSubmit,
  isTyping,
  disabled,
  headerActions,
}: {
  variant: Variant;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isTyping: boolean;
  disabled?: boolean;
  headerActions?: React.ReactNode;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const shellClass =
    variant === "full"
      ? "flex flex-col h-[min(720px,calc(100dvh-220px))] min-h-[420px] w-full glass-panel rounded-2xl border border-border overflow-hidden shadow-xl lg:rounded-none lg:border-0 lg:shadow-none"
      : "flex flex-col h-full min-h-0 overflow-hidden";

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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10 px-4 max-w-md mx-auto">
            No messages yet — type below and send. Replies stay short and skip the intro unless
            you ask who NairaSage is.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                  : "glass-card border-border/30 rounded-tl-sm"
              }`}
            >
              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "assistant" ? "text-secondary-foreground" : ""
                }`}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse" />
                )}
              </p>

              {msg.topics && msg.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 border-t border-border/30 pt-2">
                  {msg.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-background/50 text-foreground border border-border"
                    >
                      <Sparkles className="w-3 h-3 text-primary shrink-0" />
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 shrink-0">
        <form onSubmit={onSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money…"
            disabled={disabled || isTyping}
            className="flex-1 rounded-full bg-secondary/50 border border-border pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50 transition-all"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isTyping || !input.trim()}
            className="absolute right-1 top-1 bottom-1 h-auto rounded-full bg-primary hover:bg-gold-600 shadow-md shadow-gold-500/20 disabled:bg-primary/50 disabled:shadow-none"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </Button>
        </form>
      </div>
    </div>
  );
}

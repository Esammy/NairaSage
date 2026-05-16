"use client";

import React, { useRef, useEffect } from "react";
import { Send, Bot, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage, ChatActionStatus } from "@/hooks/useAgentStream";
import { ChatActionCard } from "@/components/agent/ChatActionCard";

type Variant = "drawer" | "full";

export type NairaSageVoiceSlot = {
  supported: boolean;
  listening: boolean;
  partial: string;
  error: string | null;
  level: number;
  ttsEnabled: boolean;
  onToggleListen: () => void;
  onToggleTts: () => void;
  clearError?: () => void;
};

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
  resolveChatAction,
  voice,
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
  resolveChatAction?: (id: number, status: ChatActionStatus, error?: string) => void;
  voice?: NairaSageVoiceSlot;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fieldValue = voice?.listening ? voice.partial : input;
  const voiceListening = !!(voice?.supported && voice.listening);

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
          <div key={msg.id} className="space-y-2">
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
            {msg.role === "assistant" &&
              msg.actions &&
              msg.actions.length > 0 &&
              resolveChatAction &&
              msg.actions.map((a) => (
                <div key={`${msg.id}-act-${a.id}`} className="flex justify-start pl-0 sm:pl-1">
                  <ChatActionCard action={a} onResolved={resolveChatAction} />
                </div>
              ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 shrink-0 space-y-2">
        {voice?.supported && voice.error ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span className="min-w-0">{voice.error}</span>
            {voice.clearError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 text-destructive"
                onClick={voice.clearError}
              >
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          {voice?.supported ? (
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <Button
                type="button"
                variant={voice.listening ? "default" : "outline"}
                size="icon"
                className={`rounded-full relative ${voice.listening ? "animate-pulse" : ""}`}
                onClick={voice.onToggleListen}
                disabled={disabled || isTyping}
                aria-pressed={voice.listening}
                aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
              >
                {voice.listening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {voice.listening ? (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full bg-primary-foreground/80"
                    style={{
                      width: `${8 + Math.round(voice.level * 12)}px`,
                      opacity: 0.5 + voice.level * 0.5,
                    }}
                    aria-hidden
                  />
                ) : null}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={voice.onToggleTts}
                aria-pressed={voice.ttsEnabled}
                aria-label={voice.ttsEnabled ? "Turn off read aloud" : "Turn on read aloud"}
              >
                {voice.ttsEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          ) : null}
          <div className="flex-1 relative min-w-0">
            <span className="sr-only" aria-live="polite">
              {voiceListening ? voice?.partial || "Listening" : ""}
            </span>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => {
                if (voice?.listening) return;
                setInput(e.target.value);
              }}
              placeholder="Ask anything about your money…"
              readOnly={voiceListening}
              disabled={disabled || isTyping}
              className={`w-full rounded-full bg-secondary/50 border border-border pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50 transition-all ${
                voiceListening ? "italic text-muted-foreground" : ""
              }`}
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                disabled ||
                isTyping ||
                !fieldValue.trim() ||
                (voice?.listening ?? false)
              }
              className="absolute right-1 top-1 bottom-1 h-auto rounded-full bg-primary hover:bg-gold-600 shadow-md shadow-gold-500/20 disabled:bg-primary/50 disabled:shadow-none"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

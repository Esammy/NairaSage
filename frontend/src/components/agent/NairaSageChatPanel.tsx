"use client";

import React, { useRef, useEffect, useState } from "react";
import { Send, Bot, Sparkles, Mic, MicOff, Volume2, VolumeX, Lightbulb, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage, ChatActionStatus } from "@/hooks/useAgentStream";
import { ChatActionCard } from "@/components/agent/ChatActionCard";
import { AgentOrchestrationPanel } from "@/components/agent/AgentOrchestrationPanel";
import { Markdown } from "@/components/ui/Markdown";
import { COACH_SUGGESTION_PROMPTS } from "@/lib/coach-prompts";

type Variant = "drawer" | "full";

export type NairaSageAttachSlot = {
  busy: boolean;
  /** Receives a statement/receipt image picked by the user. */
  onPick: (file: File) => void;
};

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
  onSend,
  onStop,
  isTyping,
  disabled,
  headerActions,
  resolveChatAction,
  voice,
  attach,
  onSuggest,
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
  resolveChatAction?: (id: number, status: ChatActionStatus, error?: string) => void;
  voice?: NairaSageVoiceSlot;
  /** If set, shows a paperclip for scanning statement/receipt photos. */
  attach?: NairaSageAttachSlot;
  /** If set, suggestion chips send immediately; otherwise they fill the input. */
  onSuggest?: (prompt: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // null = no explicit user choice: grid shows until the first message lands.
  const [suggestionsPref, setSuggestionsPref] = useState<boolean | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pickSuggestion = (prompt: string) => {
    if (onSuggest) onSuggest(prompt);
    else setInput(prompt);
  };

  const fieldValue = voice?.listening ? voice.partial : input;
  const showSuggestionGrid = suggestionsPref ?? messages.length === 0;
  const voiceListening = !!(voice?.supported && voice.listening);

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
          <p className="text-sm text-muted-foreground text-center px-4 max-w-md mx-auto mb-4">
            Pick a starter below or type your own question.
          </p>
        )}
        {showSuggestionGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto pb-2">
            {COACH_SUGGESTION_PROMPTS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={disabled || isTyping}
                onClick={() => pickSuggestion(s.prompt)}
                className="text-left rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === "assistant" && msg.orchestration ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] sm:max-w-[85%] w-full">
                  <AgentOrchestrationPanel
                    orchestration={msg.orchestration}
                    isStreaming={msg.isStreaming}
                  />
                </div>
              </div>
            ) : null}
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                    : "glass-card border-border/30 rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="text-sm leading-relaxed">
                    <Markdown>{msg.content}</Markdown>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

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
        {messages.length > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => setSuggestionsPref(!showSuggestionGrid)}
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden />
              {showSuggestionGrid ? "Hide suggestions" : "Suggestions"}
            </Button>
            {voice?.supported ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-7 text-xs gap-1 ${voice.ttsEnabled ? "text-primary" : "text-muted-foreground"}`}
                onClick={voice.onToggleTts}
                aria-pressed={voice.ttsEnabled}
                title={voice.ttsEnabled ? "Replies are read aloud — tap to mute" : "Read replies aloud"}
              >
                {voice.ttsEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" aria-hidden />
                )}
                Read aloud {voice.ttsEnabled ? "on" : "off"}
              </Button>
            ) : null}
          </div>
        ) : null}
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
          {attach ? (
            <label
              className={`shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full border border-border cursor-pointer hover:bg-secondary/50 transition-colors ${
                attach.busy || disabled || isTyping ? "opacity-50 pointer-events-none" : ""
              }`}
              aria-label="Scan a statement or receipt photo"
              title="Scan a statement or receipt photo"
            >
              {attach.busy ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden />
              ) : (
                <Paperclip className="w-4 h-4 text-muted-foreground" aria-hidden />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={attach.busy || disabled || isTyping}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) attach.onPick(file);
                }}
              />
            </label>
          ) : null}
          {voice?.supported ? (
            <Button
              type="button"
              variant={voice.listening ? "default" : "outline"}
              size="icon"
              className={`relative h-11 w-11 shrink-0 rounded-full ${voice.listening ? "animate-pulse" : ""}`}
              onClick={voice.onToggleListen}
              disabled={disabled || isTyping}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? "Stop recording and send" : "Record a voice message"}
              title={voice.listening ? "Tap to stop and send" : "Tap to speak"}
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

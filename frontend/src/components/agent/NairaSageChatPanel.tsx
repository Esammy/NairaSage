"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Bot, Mic, MicOff, Volume2, VolumeX, Lightbulb, Paperclip, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage, ChatActionStatus } from "@/hooks/useAgentStream";
import { ChatActionCard } from "@/components/agent/ChatActionCard";
import { AgentOrchestrationPanel } from "@/components/agent/AgentOrchestrationPanel";
import { MessageBubble } from "@/components/agent/MessageBubble";
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
  input: controlledInput,
  setInput: controlledSetInput,
  retryAssistantMessage,
  regenerateAssistantMessage,
}: {
  variant: Variant;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onStop?: () => void;
  isTyping: boolean;
  disabled?: boolean;
  headerActions?: React.ReactNode;
  resolveChatAction?: (id: number, status: ChatActionStatus, error?: string) => void;
  voice?: NairaSageVoiceSlot;
  /** If set, shows a paperclip for scanning statement/receipt photos. */
  attach?: NairaSageAttachSlot;
  /** If set, suggestion chips send immediately; otherwise they fill the input. */
  onSuggest?: (prompt: string) => void;
  /** Optional controlled draft (e.g. URL prefill / external prime). */
  input?: string;
  setInput?: React.Dispatch<React.SetStateAction<string>>;
  retryAssistantMessage?: (id: string) => void | Promise<void>;
  regenerateAssistantMessage?: (id: string) => void | Promise<void>;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [internalInput, setInternalInput] = useState("");
  // null = no explicit user choice: grid shows until the first message lands.
  const [suggestionsPref, setSuggestionsPref] = useState<boolean | null>(null);

  const isControlled = controlledInput !== undefined && controlledSetInput !== undefined;
  const input = isControlled ? controlledInput : internalInput;
  const setInput = isControlled ? controlledSetInput : setInternalInput;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = fieldValue.trim();
    if (!text || disabled || isTyping || voiceListening) return;
    onSend(text);
    setInput("");
  };

  const onRetry = useCallback(
    (id: string) => {
      void retryAssistantMessage?.(id);
    },
    [retryAssistantMessage]
  );

  const onRegen = useCallback(
    (id: string) => {
      void regenerateAssistantMessage?.(id);
    },
    [regenerateAssistantMessage]
  );

  const shellClass =
    variant === "full"
      ? "flex flex-col h-[min(720px,calc(100dvh-220px))] min-h-[420px] w-full rounded-xl border border-border bg-card overflow-hidden lg:rounded-none lg:border-0"
      : "flex flex-col h-full min-h-0 overflow-hidden";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0 bg-surface-elevated">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-medium text-foreground truncate">{title}</h3>
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
          <div className="text-center px-4 max-w-md mx-auto mb-2 pt-4">
            <p className="font-display text-lg font-medium text-foreground">How can I help?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a starter or ask about cashflow, tax, debt, or deals.
            </p>
          </div>
        )}
        {showSuggestionGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto pb-2">
            {COACH_SUGGESTION_PROMPTS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={disabled || isTyping}
                onClick={() => pickSuggestion(s.prompt)}
                className="text-left rounded-md border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground hover:border-primary/35 hover:bg-primary/5 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <MessageBubble
              msg={msg}
              onRetry={retryAssistantMessage ? onRetry : undefined}
              onRegenerate={regenerateAssistantMessage ? onRegen : undefined}
            />
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

      <div className="p-3 sm:p-4 bg-surface-elevated border-t border-border shrink-0 space-y-2">
        {messages.length > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-h-8 text-xs gap-1 text-muted-foreground"
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
                className={`h-8 min-h-8 text-xs gap-1 ${voice.ttsEnabled ? "text-primary" : "text-muted-foreground"}`}
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
          <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span className="min-w-0">{voice.error}</span>
            {voice.clearError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-destructive"
                onClick={voice.clearError}
              >
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {attach ? (
            <label
              className={`shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-ring ${
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
              className={`relative h-11 w-11 shrink-0 rounded-md ${voice.listening ? "animate-pulse" : ""}`}
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
              className={`w-full rounded-md bg-background border border-border pl-3.5 pr-12 py-2.5 h-11 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground disabled:opacity-50 ${
                voiceListening ? "italic text-muted-foreground" : ""
              }`}
            />
            {isTyping && onStop ? (
              <Button
                type="button"
                size="icon"
                onClick={onStop}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-destructive hover:bg-destructive/90"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 text-destructive-foreground fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={
                  disabled ||
                  isTyping ||
                  !fieldValue.trim() ||
                  voiceListening
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

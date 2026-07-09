"use client";

import React, { useCallback } from "react";
import { Bot, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/useAgentStream";
import { Markdown } from "@/components/ui/Markdown";

export const MessageBubble = React.memo(function MessageBubble({
  msg,
  onRetry,
  onRegenerate,
}: {
  msg: ChatMessage;
  onRetry?: (id: string) => void;
  onRegenerate?: (id: string) => void;
}) {
  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
    } catch {
      console.error("Copy failed");
    }
  }, [msg.content]);

  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/70 rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
            <Bot className="w-3.5 h-3.5 text-primary" aria-hidden />
            <span className="font-medium text-foreground/80">NairaSage</span>
          </div>
        )}

        {msg.isThinking && !msg.content && (
          <div
            className="space-y-2 py-1"
            role="status"
            aria-label="NairaSage is thinking"
          >
            <div className="h-2 rounded bg-muted/80 w-[85%] animate-pulse" />
            <div className="h-2 rounded bg-muted/60 w-[60%] animate-pulse" />
            <div className="h-2 rounded bg-muted/50 w-[70%] animate-pulse" />
          </div>
        )}

        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <>
            {msg.content ? (
              <div className="text-sm leading-relaxed prose-headings:font-display">
                <Markdown>{msg.content}</Markdown>
              </div>
            ) : null}
            {msg.isStreaming && msg.content ? (
              <span
                className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse"
                aria-hidden
              />
            ) : null}
          </>
        )}

        {msg.topics && msg.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
            {msg.topics.map((topic) => (
              <span
                key={topic}
                className="text-[10px] text-muted-foreground border-b border-border/60 pb-px"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1 justify-end">
          {msg.content ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => void copyText()}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          ) : null}
          {!isUser && msg.isError && onRetry ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => onRetry(msg.id)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          ) : null}
          {!isUser && !msg.isStreaming && !msg.isError && msg.content && onRegenerate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => onRegenerate(msg.id)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

"use client";

import React, { useCallback } from "react";
import { Bot, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/useAgentStream";
import { AssistantMarkdown } from "@/components/agent/AssistantMarkdown";

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
        className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
            : "glass-card border-border/30 rounded-tl-sm"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Bot className="w-3.5 h-3.5" />
            <span>NairaSage</span>
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
              <AssistantMarkdown content={msg.content} />
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

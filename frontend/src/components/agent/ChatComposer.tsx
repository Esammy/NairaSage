"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_TEXTAREA_ROWS = 8;
const LINE_HEIGHT_PX = 22;

export function ChatComposer({
  onSend,
  onStop,
  disabled,
  isStreaming,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming: boolean;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const submitNow = () => {
    const t = value.trim();
    if (!t || disabled || isStreaming) return;
    onSend(t);
    setValue("");
    requestAnimationFrame(resize);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitNow();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitNow();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 relative items-end">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask anything about your money…"
        disabled={disabled || isStreaming}
        className="flex-1 min-h-[44px] max-h-[176px] rounded-2xl bg-secondary/50 border border-border pl-4 pr-24 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50 transition-all resize-none leading-[22px]"
        aria-label="Message to NairaSage"
      />
      {isStreaming ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute right-1 bottom-1 h-9 rounded-full"
          onClick={onStop}
        >
          <Square className="w-3.5 h-3.5 mr-1 fill-current" />
          Stop
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={disabled || isStreaming || !value.trim()}
          className="absolute right-1 bottom-1 h-9 w-9 rounded-full bg-primary hover:bg-gold-600 shadow-md shadow-gold-500/20 disabled:bg-primary/50 disabled:shadow-none"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </Button>
      )}
    </form>
  );
}

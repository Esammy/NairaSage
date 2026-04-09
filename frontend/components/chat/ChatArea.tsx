"use client";

import Link from "next/link";
import useChat from "@/lib/hooks/useChat";
import ChatInput from "./ChatInput";

export function ChatArea() {
  const { messages, sendMessage, stopStream, streaming, lastError, canRetry, retryLast } = useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto w-full relative">
      <div className="flex-1 overflow-y-auto pt-8 pb-32 flex flex-col gap-8 scrollbar-hide">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand tracking-tight">Coordinator</h1>
            <p className="text-ink-muted text-sm mt-1">
              Ask about spending, investing, tax context, and goals — not personalized investment advice.
            </p>
          </div>
          <Link
            href="/risk-disclosure"
            className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-ink-muted hover:text-brand underline-offset-2 hover:underline"
          >
            Risk disclosure
          </Link>
        </div>

        {messages.length === 0 && (
          <p className="text-sm text-ink-muted leading-relaxed border border-ink-faint/15 rounded-2xl p-6 bg-white/80">
            Start with a question in plain language, for example: &quot;How should I think about emergency savings in
            Naira?&quot; Replies include an educational disclaimer.
          </p>
        )}

        {canRetry ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center gap-3">
            <span>{lastError}</span>
            <button
              type="button"
              onClick={() => retryLast()}
              className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900"
            >
              Retry
            </button>
          </div>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="bg-surface-card border border-ink-faint/10 rounded-2xl rounded-tr-sm p-4 shadow-sm max-w-[85%]">
                <p className="text-ink leading-relaxed">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="bg-white border border-ink-faint/10 rounded-2xl p-4 shadow-sm max-w-[85%]">
                <p className="text-ink leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          )
        )}
      </div>

      <ChatInput onSend={sendMessage} onStop={stopStream} loading={streaming} />
    </div>
  );
}

"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Coins, Compass, Layers, Target } from "lucide-react";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useStreamingBrowserTts } from "@/hooks/useStreamingBrowserTts";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CITATION_DISCLOSURE } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { cancelSpeech, warmupSpeechSynthesis } from "@/lib/voice/tts";

const SUGGESTED: Array<{ icon: React.ElementType; prompt: string }> = [
  { icon: Coins, prompt: "Help me turn one month of my savings into a cashflow asset." },
  { icon: Compass, prompt: "Which CASHFLOW quadrant should I focus on next, and why?" },
  { icon: Layers, prompt: "Grade my 10 Investor Controls for my latest deal." },
  { icon: Target, prompt: "What is my one next action to raise my investor level?" },
  { icon: BookOpen, prompt: "Teach me about the B-I Triangle using a simple example." },
];

function WealthChatInner() {
  const ttsEnabledRef = useRef(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceBackendOk, setVoiceBackendOk] = useState(true);
  const streamingTtsRef = useStreamingBrowserTts("en-US");

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
    if (!ttsEnabled) {
      streamingTtsRef.current?.cancelAll();
      cancelSpeech();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    warmupSpeechSynthesis();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/django/wealth/voice/token/", { credentials: "include" }).then((r) => {
      if (cancelled) return;
      if (r.status === 503) {
        setVoiceBackendOk(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { messages, sendMessage, isTyping, resolveChatAction, actionStrip } = useAgentStream({
    onAssistantStreamStart: (messageId) => {
      if (!ttsEnabledRef.current) return;
      streamingTtsRef.current?.startTurn(messageId);
    },
    onAssistantDelta: ({ messageId, delta }) => {
      if (!ttsEnabledRef.current) return;
      streamingTtsRef.current?.pushDelta(messageId, delta);
    },
    onAssistantStreamEnd: (messageId) => {
      if (!ttsEnabledRef.current) return;
      streamingTtsRef.current?.endTurn(messageId);
    },
  });

  const voiceChat = useVoiceChat({
    onFinal: (text) => {
      void sendMessage(text);
    },
    onBargeIn: () => {
      if (!ttsEnabledRef.current) return;
      streamingTtsRef.current?.cancelAll();
      cancelSpeech();
    },
  });

  const [input, setInput] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = searchParams?.get("prompt");
    if (p) setInput(p);
  }, [searchParams]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    void sendMessage(input);
    setInput("");
  };

  const prime = (prompt: string) => {
    setInput(prompt);
  };

  const mediaOk =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const voiceSupported = mediaOk && voiceBackendOk;

  const toggleTts = useCallback(() => {
    setTtsEnabled((v) => !v);
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">NairaSage Coach</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Your wealth coach uses your live statement, quadrant, phase, level, and deals.
            Specialist agents join when needed. Changes to your data always need a confirm card.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 max-w-3xl">{CITATION_DISCLOSURE}</p>
        </div>
        <ExplainChip prompt="Explain the coach chat page, tools, and how action confirmations work." />
      </header>

      {actionStrip.length > 0 && (
        <div
          className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs"
          aria-label="Actions in this chat"
        >
          <div className="font-semibold text-foreground mb-1">Actions in this chat</div>
          <ul className="flex flex-wrap gap-2">
            {actionStrip.map((a) => (
              <li
                key={a.id}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                #{a.id} · {a.status}
                {a.human_summary ? ` · ${a.human_summary.slice(0, 48)}` : ""}
                {a.error ? ` · ${a.error.slice(0, 40)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {messages.length === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Try a starter prompt</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUGGESTED.map(({ icon: Icon, prompt }) => (
              <button
                key={prompt}
                type="button"
                onClick={() => prime(prompt)}
                className="flex items-start gap-2 text-left rounded-md border border-border p-3 text-sm hover:border-primary/60 hover:bg-secondary/40 transition"
              >
                <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden />
                <span>{prompt}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="h-[70vh] min-h-[500px]">
        <NairaSageChatPanel
          variant="full"
          title="NairaSage Coach"
          subtitle={`Frameworks cited as references where noted. ${CITATION_DISCLOSURE.slice(0, 80)}…`}
          messages={messages}
          input={input}
          setInput={setInput}
          onSubmit={handleSend}
          isTyping={isTyping}
          resolveChatAction={resolveChatAction}
          voice={{
            supported: voiceSupported,
            listening: voiceChat.listening,
            partial: voiceChat.partial,
            error: voiceChat.error,
            level: voiceChat.level,
            ttsEnabled,
            onToggleListen: voiceChat.toggle,
            onToggleTts: toggleTts,
            clearError: voiceChat.clearError,
          }}
        />
      </div>
    </div>
  );
}

export default function WealthChatPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground py-10 text-center">Loading coach…</div>
      }
    >
      <WealthChatInner />
    </Suspense>
  );
}

"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Coins, Compass, Layers, Target } from "lucide-react";
import { History, Plus } from "lucide-react";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { ChatHistorySidebar } from "@/components/agent/ChatHistorySidebar";
import { useAgentStream, type ChatMessage, type OutcomeTurn } from "@/hooks/useAgentStream";
import { usePersistentCoachSession } from "@/hooks/usePersistentCoachSession";
import { Button } from "@/components/ui/button";
import { scanDocument, scanProposalsToActions } from "@/lib/document-scan";
import { useStreamingBrowserTts } from "@/hooks/useStreamingBrowserTts";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CITATION_DISCLOSURE } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { cancelSpeech, warmupSpeechSynthesis } from "@/lib/voice/tts";
import { VOICE_MODE } from "@/lib/voice/qwen-transcribe";

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
    // Qwen push-to-talk needs no pre-minted token; only AssemblyAI streaming does.
    if (VOICE_MODE === "qwen") return;
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

  const hydrateRef = useRef<(o: OutcomeTurn[]) => void>(() => {});
  const { sessionId, sessions, startNewSession, openSession, refreshSessions } =
    usePersistentCoachSession(hydrateRef);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    messages,
    setMessages,
    sendMessage,
    isTyping,
    resolveChatAction,
    actionStrip,
    hydrateFromOutcomes,
    stopStreaming,
    retryAssistantMessage,
    regenerateAssistantMessage,
  } = useAgentStream({
    sessionId,
    onTurnComplete: () => {
      void refreshSessions();
    },
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
  useEffect(() => {
    hydrateRef.current = hydrateFromOutcomes;
  }, [hydrateFromOutcomes]);

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

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;
      void sendMessage(text);
      setInput("");
    },
    [sendMessage, isTyping]
  );

  const prime = (prompt: string) => {
    setInput(prompt);
  };

  const handleNewChat = useCallback(() => {
    setInput("");
    setHistoryOpen(false);
    void startNewSession();
  }, [startNewSession]);

  const handleSelectSession = useCallback(
    (id: number) => {
      setHistoryOpen(false);
      void openSession(id);
    },
    [openSession]
  );

  const [scanning, setScanning] = useState(false);

  const handleAttach = async (file: File) => {
    setScanning(true);
    const stamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `scan-u-${stamp}`, role: "user", content: `📎 Scanning ${file.name}…` },
    ]);
    try {
      const result = await scanDocument(file);
      const reply: ChatMessage = {
        id: `scan-a-${stamp}`,
        role: "assistant",
        content:
          result.summary ||
          "I analyzed the document but could not extract anything actionable.",
        topics: ["Document scan"],
        actions: scanProposalsToActions(result),
      };
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `scan-a-${stamp}`,
          role: "assistant",
          content: e instanceof Error ? e.message : "Document scan failed. Please try again.",
        },
      ]);
    } finally {
      setScanning(false);
    }
  };

  const mediaOk =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const voiceSupported = mediaOk && voiceBackendOk;

  const toggleTts = useCallback(() => {
    setTtsEnabled((v) => !v);
  }, []);

  return (
    <div className="flex gap-4 items-start">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl border border-border bg-card/40 overflow-hidden">
        <ChatHistorySidebar
          sessions={sessions}
          activeId={sessionId}
          onNewChat={handleNewChat}
          onSelect={handleSelectSession}
        />
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">NairaSage Coach</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Your wealth coach uses your live statement, quadrant, phase, level, and deals.
            Specialist agents join when needed. Changes to your data always need a confirm card.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 max-w-3xl">{CITATION_DISCLOSURE}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 lg:hidden">
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
              New
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </div>
          <ExplainChip prompt="Explain the coach chat page, tools, and how action confirmations work." />
        </div>
      </header>

      {historyOpen && (
        <div className="lg:hidden rounded-2xl border border-border bg-card/60 overflow-hidden max-h-[50vh]">
          <ChatHistorySidebar
            sessions={sessions}
            activeId={sessionId}
            onNewChat={handleNewChat}
            onSelect={handleSelectSession}
          />
        </div>
      )}

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
          onSend={handleSend}
          onStop={stopStreaming}
          isTyping={isTyping}
          resolveChatAction={resolveChatAction}
          retryAssistantMessage={retryAssistantMessage}
          regenerateAssistantMessage={regenerateAssistantMessage}
          attach={{
            busy: scanning,
            onPick: (file) => {
              void handleAttach(file);
            },
          }}
          onSuggest={(text) => {
            void sendMessage(text);
          }}
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

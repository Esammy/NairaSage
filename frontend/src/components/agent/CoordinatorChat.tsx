"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Plus, History } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgentStream, type OutcomeTurn } from "@/hooks/useAgentStream";
import { usePersistentCoachSession } from "@/hooks/usePersistentCoachSession";
import { useStreamingBrowserTts } from "@/hooks/useStreamingBrowserTts";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { ChatHistorySidebar } from "@/components/agent/ChatHistorySidebar";
import { cancelSpeech, warmupSpeechSynthesis } from "@/lib/voice/tts";
import { VOICE_MODE } from "@/lib/voice/qwen-transcribe";

/** Slide-over quick chat; full-page chat lives at `/dashboard/chat`. */
export function NairaSageQuickChat({
  isOpen,
  onClose,
  coachPrefill,
  onConsumePrefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  coachPrefill?: string;
  onConsumePrefill?: () => void;
}) {
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
    sendMessage,
    isTyping,
    resolveChatAction,
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

  useEffect(() => {
    if (isOpen && coachPrefill !== undefined && coachPrefill !== "") {
      // Deferred so the prefill lands without a sync re-render of the drawer.
      void Promise.resolve().then(() => {
        setInput(coachPrefill);
        onConsumePrefill?.();
      });
    }
  }, [isOpen, coachPrefill, onConsumePrefill]);

  useEffect(() => {
    if (!isOpen) {
      voiceChat.stop();
      cancelSpeech();
      streamingTtsRef.current?.cancelAll();
    }
  }, [isOpen, voiceChat.stop]);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;
      void sendMessage(text);
      setInput("");
    },
    [sendMessage, isTyping]
  );

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

  const mediaOk =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const voiceSupported = mediaOk && voiceBackendOk;

  const toggleTts = useCallback(() => {
    setTtsEnabled((v) => !v);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:bg-transparent lg:backdrop-blur-none"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-full max-w-[450px] lg:max-w-lg h-[600px] max-h-[85vh] z-50 glass-panel rounded-2xl flex flex-col shadow-2xl border border-primary/20 overflow-hidden"
          >
            <div className="relative flex flex-1 flex-col min-h-0">
              {historyOpen && (
                <>
                  <div
                    className="absolute inset-0 z-20 bg-background/40"
                    onClick={() => setHistoryOpen(false)}
                  />
                  <div className="absolute top-14 left-2 right-2 z-30 max-h-[70%] rounded-xl border border-border bg-card shadow-xl overflow-hidden flex flex-col">
                    <ChatHistorySidebar
                      sessions={sessions}
                      activeId={sessionId}
                      onNewChat={handleNewChat}
                      onSelect={handleSelectSession}
                    />
                  </div>
                </>
              )}
              <NairaSageChatPanel
                variant="drawer"
                title="NairaSage Coach"
                subtitle="Quick ask — opens the same coach as Wealth Cockpit"
                messages={messages}
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onStop={stopStreaming}
                isTyping={isTyping}
                resolveChatAction={resolveChatAction}
                retryAssistantMessage={retryAssistantMessage}
                regenerateAssistantMessage={regenerateAssistantMessage}
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
                headerActions={
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewChat}
                      className="rounded-full"
                      title="New chat"
                      aria-label="New chat"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistoryOpen((v) => !v)}
                      className={cn("rounded-full", historyOpen && "bg-secondary")}
                      title="Conversation history"
                      aria-label="Conversation history"
                      aria-expanded={historyOpen}
                    >
                      <History className="h-5 w-5" />
                    </Button>
                    <Link
                      href="/wealth/chat"
                      onClick={onClose}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "hidden sm:inline-flex h-8 px-2"
                      )}
                    >
                      <Maximize2 className="h-4 w-4 mr-1" />
                      Full page
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

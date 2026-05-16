"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useStreamingBrowserTts } from "@/hooks/useStreamingBrowserTts";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { cancelSpeech, warmupSpeechSynthesis } from "@/lib/voice/tts";

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

  const { messages, sendMessage, isTyping, resolveChatAction } = useAgentStream({
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

  useEffect(() => {
    if (isOpen && coachPrefill !== undefined && coachPrefill !== "") {
      setInput(coachPrefill);
      onConsumePrefill?.();
    }
  }, [isOpen, coachPrefill, onConsumePrefill]);

  useEffect(() => {
    if (!isOpen) {
      voiceChat.stop();
      cancelSpeech();
      streamingTtsRef.current?.cancelAll();
    }
  }, [isOpen, voiceChat.stop]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    void sendMessage(input);
    setInput("");
  };

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
            <div className="flex flex-1 flex-col min-h-0">
              <NairaSageChatPanel
                variant="drawer"
                title="NairaSage Coach"
                subtitle="Quick ask — opens the same coach as Wealth Cockpit"
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
                headerActions={
                  <div className="flex items-center gap-1 shrink-0">
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

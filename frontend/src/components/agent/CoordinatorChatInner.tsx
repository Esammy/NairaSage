"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgentStream } from "@/hooks/useAgentStream";
import { NairaSageChatPanel } from "@/components/agent/NairaSageChatPanel";
import { useChatSessionStore } from "@/lib/chat-session-store";

export function NairaSageQuickChatInner({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const sessionId = useChatSessionStore((s) => s.coordinatorSessionId);
  const {
    messages,
    sendMessage,
    isTyping,
    stopStreaming,
    retryAssistantMessage,
    regenerateAssistantMessage,
  } = useAgentStream({
    sessionId,
  });

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage]
  );

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
                title="NairaSage"
                subtitle="Quick ask"
                messages={messages}
                onSend={handleSend}
                onStop={stopStreaming}
                isTyping={isTyping}
                headerActions={
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href="/dashboard/chat"
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
                retryAssistantMessage={retryAssistantMessage}
                regenerateAssistantMessage={regenerateAssistantMessage}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

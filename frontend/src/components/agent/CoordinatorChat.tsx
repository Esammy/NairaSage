"use client";

import dynamic from "next/dynamic";

const NairaSageQuickChatInner = dynamic(
  () =>
    import("@/components/agent/CoordinatorChatInner").then((m) => m.NairaSageQuickChatInner),
  { ssr: false, loading: () => null }
);

export function NairaSageQuickChat({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return <NairaSageQuickChatInner isOpen={isOpen} onClose={onClose} />;
}

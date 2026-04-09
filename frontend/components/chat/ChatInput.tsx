"use client";

import { useState } from "react";
import { Send, Mic, Paperclip, Image as ImageIcon } from "lucide-react";

type Props = {
  onSend: (text: string) => void;
  onStop?: () => void;
  loading?: boolean;
};

export function ChatInput({ onSend, onStop, loading }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="absolute bottom-8 left-0 right-0 bg-white rounded-2xl shadow-panel border border-ink-faint/10 p-3 flex items-center gap-3">
      <button className="p-2 text-ink-muted hover:text-brand transition-colors"><Paperclip className="w-5 h-5" /></button>
      <button className="p-2 text-ink-muted hover:text-brand transition-colors"><ImageIcon className="w-5 h-5" /></button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
        type="text"
        placeholder="Issue a sovereign command..."
        className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-ink placeholder:text-ink-muted/50 text-base"
      />

      <button className="p-2 text-ink-muted hover:text-brand transition-colors"><Mic className="w-5 h-5" /></button>
      {loading ? (
        <button
          onClick={onStop}
          type="button"
          className="rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSend}
          type="button"
          className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-all shadow-md"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      )}
    </div>
  );
}

export default ChatInput;

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const lower = lang.toLowerCase();
  const prefer = [
    (v: SpeechSynthesisVoice) =>
      v.lang.toLowerCase().startsWith("en-ng") ||
      v.name.toLowerCase().includes("nigeria"),
    (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("en-gb"),
    (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("en-us"),
    (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(lower.split("-")[0] || "en"),
  ];
  for (const pred of prefer) {
    const v = voices.find(pred);
    if (v) return v;
  }
  return voices[0] ?? null;
}

export function warmupSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  void window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    void window.speechSynthesis.getVoices();
  };
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function enqueueSpeech(
  text: string,
  options?: { lang?: string; rate?: number }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  const u = new SpeechSynthesisUtterance(cleaned);
  u.lang = options?.lang || "en-US";
  u.rate = options?.rate ?? 1;
  const v = pickVoice(u.lang);
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

import { cancelSpeech, enqueueSpeech } from "@/lib/voice/tts";

const SENTENCE_END = /[.!?](\s|$)/;
const FLUSH_LEN = 80;

export class StreamingBrowserTts {
  private buffer = "";
  private activeId: string | null = null;
  private readonly lang: string;
  private readonly rate: number;

  constructor(opts: { lang: string; rate?: number }) {
    this.lang = opts.lang;
    this.rate = opts.rate ?? 1;
  }

  startTurn(messageId: string): void {
    this.activeId = messageId;
    this.buffer = "";
  }

  pushDelta(messageId: string, delta: string): void {
    if (this.activeId !== messageId) {
      this.startTurn(messageId);
    }
    this.buffer += delta;
    this.flushSpeakableChunks();
  }

  endTurn(messageId: string): void {
    if (this.activeId !== messageId) return;
    const rest = this.buffer.replace(/\s+/g, " ").trim();
    this.buffer = "";
    if (rest) {
      enqueueSpeech(rest, { lang: this.lang, rate: this.rate });
    }
    this.activeId = null;
  }

  cancelAll(): void {
    this.buffer = "";
    this.activeId = null;
    cancelSpeech();
  }

  private flushSpeakableChunks(): void {
    let guard = 0;
    while (this.buffer.length > 0 && guard++ < 64) {
      const m = this.buffer.match(SENTENCE_END);
      if (m && m.index !== undefined) {
        const end = m.index + 1;
        const chunk = this.buffer.slice(0, end).replace(/\s+/g, " ").trim();
        this.buffer = this.buffer.slice(end);
        if (chunk) {
          enqueueSpeech(chunk, { lang: this.lang, rate: this.rate });
        }
        continue;
      }
      if (this.buffer.length >= FLUSH_LEN) {
        const comma = this.buffer.indexOf(",");
        if (comma > 10) {
          const chunk = this.buffer.slice(0, comma + 1).replace(/\s+/g, " ").trim();
          this.buffer = this.buffer.slice(comma + 1);
          if (chunk) {
            enqueueSpeech(chunk, { lang: this.lang, rate: this.rate });
          }
          continue;
        }
      }
      break;
    }
  }
}

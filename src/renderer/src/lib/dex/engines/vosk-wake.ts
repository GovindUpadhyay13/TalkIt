import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import type { KaldiRecognizer } from "vosk-browser";
import type { EngineStatus, WakeEngine } from "./types";
import { loadVoskModel, floatFromFrame } from "./vosk-model";

/**
 * Fully-local, offline, no-signup hands-free wake word via Vosk (WASM). A Kaldi
 * recognizer constrained to a small grammar (the wake word + "[unk]") listens
 * continuously and fires onWake when the word is recognized.
 */
export class VoskWakeEngine implements WakeEngine {
  private rec: KaldiRecognizer | null = null;
  private sink: { postMessage: (e: { command: string; inputFrame?: Int16Array }) => void; onmessage: null } | null =
    null;
  private fired = false;

  constructor(
    private readonly wakeWord: string,
    private readonly modelUrl: string | undefined,
    private readonly onStatus: (s: EngineStatus) => void,
    private readonly onLoading?: (loading: boolean) => void,
  ) {}

  async start(onWake: () => void): Promise<void> {
    // Strictly listen for "Hey TalkIt" only — never trigger on generic words like "take it", "target", or "computer"
    const wakePhrases = [
      "hey talk it",
      "hey talkit",
    ];
    try {
      this.onLoading?.(true);
      const model = await loadVoskModel(this.modelUrl);
      this.onLoading?.(false);
      // Constrain recognition strictly to "hey talk it" + "[unk]" to prevent false triggers from videos or room noise.
      this.rec = new model.KaldiRecognizer(16000, JSON.stringify([...wakePhrases, "[unk]"]));
      const STRICT_WAKE_REGEX = /\bhey\s+talk\s*it\b/i;

      const matches = (text?: string) => {
        if (!text) return false;
        const cleaned = text.trim();
        return STRICT_WAKE_REGEX.test(cleaned);
      };

      const trigger = () => {
        if (this.fired) return;
        this.fired = true;
        onWake();
      };
      // Only fire on confirmed result or full phrase to prevent false triggers on background audio/videos
      this.rec.on("result", (m) => {
        if (matches(m.result?.text)) trigger();
      });
      this.rec.on("partialresult", (m) => {
        if (matches(m.result?.partial)) trigger();
      });

      this.sink = {
        onmessage: null,
        postMessage: (e) => {
          if (e.command === "process" && e.inputFrame && this.rec) {
            this.rec.acceptWaveformFloat(floatFromFrame(e.inputFrame), 16000);
          }
        },
      };
      await WebVoiceProcessor.subscribe(this.sink);
      this.onStatus("ok");
    } catch (err) {
      console.error("[opendex] vosk wake init failed", err);
      this.onLoading?.(false);
      this.onStatus("error");
      await this.dispose();
    }
  }

  async stop(): Promise<void> {
    if (this.sink) {
      try {
        await WebVoiceProcessor.unsubscribe(this.sink);
      } catch {
        // ignore
      }
      this.sink = null;
    }
  }

  async dispose(): Promise<void> {
    await this.stop();
    try {
      this.rec?.remove();
    } catch {
      // ignore
    }
    this.rec = null;
  }
}

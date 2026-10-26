import { useEffect, useState } from "react";
import { Mic, Pause, Square } from "lucide-react";
import { ToolActivityBanner, StopControl } from "@/components/tool-activity-banner";
import type { SessionState } from "../../main/ipc/channels";

// The always-on-top action HUD & transcription toggle.
// Floats above all windows (Antigravity, Chrome, VS Code) without stealing focus.
export function OverlayApp() {
  const [state, setState] = useState<SessionState | null>(null);

  useEffect(() => window.opendex.onSessionState(setState), []);

  const isWriting = state?.status === "writing";
  const isPaused = state?.status === "paused";
  const isThinkingOrSpeaking = state?.status === "thinking" || state?.status === "speaking";
  const busy = isWriting || isPaused || isThinkingOrSpeaking;

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-start pt-2 overflow-hidden select-none">
      {busy && (
        <div
          className="pointer-events-auto"
          onMouseEnter={() => window.opendex.setOverlayInteractive(true)}
          onMouseLeave={() => window.opendex.setOverlayInteractive(false)}
        >
          {isWriting && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-dex-surface/95 border border-primary/50 text-foreground text-xs font-medium backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute opacity-75" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  <span>Transcribing (Wispr Flow)</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Say <span className="text-foreground font-medium">&ldquo;Whisper wait&rdquo;</span> to pause
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.opendex.overlayInterrupt()}
                title="Stop transcription"
                className="ml-1.5 p-1 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>
          )}

          {isPaused && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-dex-surface/95 border border-amber-500/50 text-foreground text-xs font-medium backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Whisper Waiting (Paused)</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Type freely · Say <span className="text-foreground font-medium">&ldquo;TalkIt continue&rdquo;</span> to resume
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.opendex.overlayInterrupt()}
                title="End session"
                className="ml-1.5 p-1 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>
          )}

          {isThinkingOrSpeaking && (
            <StopControl onStop={() => window.opendex.overlayInterrupt()} />
          )}
        </div>
      )}
      {state && state.activity.length > 0 && (
        <ToolActivityBanner activity={state.activity} />
      )}
    </div>
  );
}

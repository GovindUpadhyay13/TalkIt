import { useState } from "react";
import { Code2, Minimize2, Mic, MicOff, Settings, SquarePen, X, Zap } from "lucide-react";
import { StatusPill } from "@/components/status-bar";
import { Button } from "@/components/ui/button";
import { TalkItBrand } from "@/components/brand/talkit-logo";
import { DeveloperCompanion } from "@/components/developer/DeveloperCompanion";
import type { DexStatus } from "@/lib/dex/state";

// Shared top bar used by every theme: brand on the left, and a single right-hand
// cluster holding the status pill, a standby (mic) toggle, and the settings gear.
// Grouping these here is what prevents them from colliding (they used to be
// rendered by separate owners in the same corner). The header itself is
// click-through so it never steals taps from the visualization underneath; only
// its controls catch pointer events.
export function ThemeTopBar({
  name,
  status,
  onOpenSettings,
  showBrand = true,
  showStatus = true,
  isMuted,
  onToggleMute,
  onMinimize,
  onNewConversation,
  isExecutionMode,
  onToggleExecutionMode,
}: {
  name?: string;
  status: DexStatus;
  onOpenSettings: () => void;
  showBrand?: boolean;
  showStatus?: boolean;
  /** Whether the wake-word loop is currently paused (standby). */
  isMuted?: boolean;
  /** Toggle standby (pause/resume listening). Hidden when omitted. */
  onToggleMute?: () => void;
  /** Collapse into the slim notch bar. Hidden when omitted. */
  onMinimize?: () => void;
  /** Start a fresh conversation (dismiss the current turn). Hidden when omitted. */
  onNewConversation?: () => void;
  isExecutionMode?: boolean;
  onToggleExecutionMode?: (enabled?: boolean) => void;
}) {
  const isListeningOrSpeaking = status === "active_listening" || status === "speaking";
  const [showDevCompanion, setShowDevCompanion] = useState(false);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <div className="traffic-light-pad flex min-w-0 items-center gap-2.5">
          {showBrand && (
            <div className="flex items-center gap-2">
              <TalkItBrand active={isListeningOrSpeaking} />
              {name && name.toLowerCase() !== "talkit" && (
                <span className="truncate text-xs font-mono uppercase tracking-[0.2em] text-[#A4ADA0]">
                  / {name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="titlebar-no-drag pointer-events-auto relative z-40 flex shrink-0 items-center gap-2">
          {/* Execution Mode On-Screen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleExecutionMode?.()}
            aria-label="Execution Mode Toggle"
            title={
              isExecutionMode
                ? "Execution Mode ON: Voice commands execute direct actions. Click to switch to Typing mode."
                : "Execution Mode OFF: Click to enable direct desktop command execution."
            }
            className={`rounded-full text-xs font-mono backdrop-blur px-2.5 py-1 flex items-center gap-1.5 transition-all ${
              isExecutionMode
                ? "bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                : "bg-dex-surface/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className={`size-3.5 ${isExecutionMode ? "text-amber-400" : "text-muted-foreground"}`} />
            <span className="text-[11px] font-semibold tracking-wide">
              {isExecutionMode ? "EXEC ON" : "EXEC"}
            </span>
          </Button>

          {/* Developer Mode On-Screen Companion Toggle/Opener */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDevCompanion(true)}
            aria-label="Developer Mode Companion"
            title="Developer Mode: Background Coding Companion"
            className="rounded-full bg-dex-surface/70 text-xs font-mono backdrop-blur px-2.5 py-1 text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <Code2 className="size-3.5 text-lime-400" />
            <span className="text-[11px] font-semibold tracking-wide">DEV</span>
          </Button>

          {showStatus && (
          <button
            type="button"
            onClick={status === "error" ? onOpenSettings : undefined}
            className={status === "error" ? "cursor-pointer transition-transform hover:scale-105 active:scale-95" : "cursor-default"}
            title={status === "error" ? "Click to open Settings and check Gemini API key" : undefined}
          >
            <StatusPill status={status} className="hidden sm:inline-flex" />
          </button>
        )}
        {onToggleMute && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onToggleMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? "Resume listening" : "Stand by (stop listening)"}
            title={
              isMuted
                ? "On standby — click to resume listening"
                : "Listening — click to stand by"
            }
            className="rounded-full bg-dex-surface/70 text-muted-foreground backdrop-blur hover:text-foreground"
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
        )}
        {onNewConversation && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onNewConversation}
            aria-label="New conversation"
            title="New conversation"
            className="rounded-full bg-dex-surface/70 text-muted-foreground backdrop-blur hover:text-foreground"
          >
            <SquarePen />
          </Button>
        )}
        {onMinimize && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onMinimize}
            aria-label="Minimize to notch"
            title="Minimize to notch"
            className="rounded-full bg-dex-surface/70 text-muted-foreground backdrop-blur hover:text-foreground"
          >
            <Minimize2 />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="rounded-full bg-dex-surface/70 text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <Settings />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => window.opendex.closeWindow()}
          aria-label="Close TalkIt"
          title="Close TalkIt"
          className="rounded-full bg-dex-surface/70 text-muted-foreground backdrop-blur hover:text-rose-400 hover:border-rose-500/40"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </header>
    <DeveloperCompanion
      isOpen={showDevCompanion}
      onClose={() => setShowDevCompanion(false)}
    />
  </>
  );
}

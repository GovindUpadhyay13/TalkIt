import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Mic, MicOff, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCardLayer } from "@skills/tool-card-layer";
import type { DexStatus } from "@/lib/dex/state";
import { cn } from "@/lib/utils";
import type { SessionToolInvocation } from "../../../main/ipc/channels";

// Notch sizing (px). The window stays screen-centered, so a fixed center gap
// always lands under the physical laptop notch and the two wings (flex-1, equal
// share) keep it centered at any width.
const COMPACT_WIDTH = 220; // at rest: status indicator + mic, no text
const WIDE_WIDTH = 480; // expanded for caption / controls / type field
const BAR_H = 44; // the always-visible bar
const CARD_H = 80; // body region for a tool-result card
const CAPTION_H = 34; // body region for a caption
const TYPE_H = 42; // the type field, revealed on hover/focus

// The notch bar's presentation. It fills its transparent, screen-centered host
// window (createNotchWindow), drawing a flat top edge flush to the screen and a
// rounded bottom so it reads as hanging from the top "notch".
//
// At rest it's compact — just the theme's status indicator + a standby (mic)
// toggle, no text. It grows (animated by the window resize, driven via
// setNotchSize) when there's a caption, a result card, or the hover-revealed
// type field. The status indicator is supplied by the active theme, so a theme
// can give the notch its own glyph. State + callbacks are wired by NotchApp.
export function CompactBar({
  status,
  caption,
  toolInvocations,
  agentName,
  isMuted,
  StatusIndicator,
  onSubmitText,
  onToggleMute,
  onNewConversation,
  onExpand,
  onOpenSettings,
}: {
  status: DexStatus;
  caption: string;
  toolInvocations: SessionToolInvocation[];
  agentName: string;
  isMuted: boolean;
  /** The active theme's status indicator (defaults to StatusDot in NotchApp). */
  StatusIndicator: ComponentType<{ status: DexStatus }>;
  onSubmitText: (text: string) => void;
  onToggleMute: () => void;
  onNewConversation: () => void;
  onExpand: () => void;
  onOpenSettings: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Pinned open by the keyboard summon (no pointer involved); cleared on
  // submit / Escape / when the window is hidden.
  const [pinned, setPinned] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasText = value.trim().length > 0;
  const rawExpanded = hovered || pinned || hasText;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (rawExpanded) {
      setExpanded(true);
      return;
    }
    const timer = setTimeout(() => setExpanded(false), 200);
    return () => clearTimeout(timer);
  }, [rawExpanded]);

  const hasCard = toolInvocations.length > 0;
  const hasCaption = caption.length > 0;
  const isBusy =
    status === "writing" ||
    status === "paused" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "active_listening" ||
    status === "follow_up_listening";

  // Drive the host window. Width is two-tier (compact at rest, wide when active/expanded)
  // so the upper toggle expands smoothly to show all changes.
  const width = hasCard || expanded || hasCaption || isBusy ? WIDE_WIDTH : COMPACT_WIDTH;
  const height = BAR_H + (hasCard ? CARD_H : 0) + (hasCaption ? CAPTION_H : 0) + (expanded ? TYPE_H : 0);
  useEffect(() => {
    window.opendex.setNotchSize(width, height);
  }, [width, height]);

  // The summon hotkey opens it without a pointer — pin it open + focus
  // the field so the user can type immediately, Spotlight-style.
  useEffect(() => {
    const reveal = () => {
      setPinned(true);
      window.opendex.focusNotch();
      inputRef.current?.focus();
    };
    window.addEventListener("opendex:summon", reveal);
    return () => window.removeEventListener("opendex:summon", reveal);
  }, []);

  // Reset to collapsed whenever the notch window is shown or hidden, or loses focus.
  useEffect(() => {
    const collapse = () => {
      setHovered(false);
      setPinned(false);
    };
    document.addEventListener("visibilitychange", collapse);
    window.addEventListener("blur", collapse);
    return () => {
      document.removeEventListener("visibilitychange", collapse);
      window.removeEventListener("blur", collapse);
    };
  }, []);

  // When it collapses, drop keyboard focus so the now-hidden field can't keep
  // capturing keystrokes.
  useEffect(() => {
    if (!expanded) inputRef.current?.blur();
  }, [expanded]);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmitText(text);
    setValue("");
    setPinned(false); // close after sending (stays open if still hovered)
  };

  const canInteract = status !== "unsupported";

  // Icon buttons are mouse-only (tabIndex -1)
  const iconButton =
    "rounded-full text-muted-foreground hover:text-foreground cursor-pointer transition-colors";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-screen w-screen flex-col overflow-hidden rounded-b-2xl bg-black border border-white/[0.08] shadow-2xl"
    >
      {/* Top bar: Left indicator + status pill, Right action controls */}
      <div className="flex w-full h-11 shrink-0 items-center justify-between px-3 bg-black/90 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIndicator status={status} />
          <span
            className={cn(
              "text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full transition-all duration-200",
              status === "writing"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : status === "paused"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : status === "thinking"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse"
                    : "text-muted-foreground",
            )}
          >
            {status === "writing"
              ? "Transcribing"
              : status === "paused"
                ? "Paused"
                : status === "thinking"
                  ? "Executing"
                  : agentName || "TalkIt"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <AnimatePresence>
            {canInteract && (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? "Resume listening" : "Stand by"}
                  title={isMuted ? "On standby — click to resume" : "Listening — click to stand by"}
                  className={iconButton}
                >
                  {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </Button>
              </motion.div>
            )}
            {expanded && (
              <motion.div
                key="expand-controls"
                className="flex items-center gap-1"
                initial={{ opacity: 0, scale: 0.6, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.6, width: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={onExpand}
                  aria-label="Expand to full window"
                  title="Expand to full window"
                  className={iconButton}
                >
                  <Maximize2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={onOpenSettings}
                  aria-label="Settings"
                  className={iconButton}
                >
                  <Settings className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={() => window.opendex.closeNotch()}
                  aria-label="Close dynamic island overlay"
                  title="Close overlay"
                  className={cn(iconButton, "hover:text-destructive")}
                >
                  <X className="size-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Speech / Live Caption */}
      <AnimatePresence>
        {hasCaption && (
          <motion.div
            key="caption"
            className="min-w-0 truncate text-[12.5px] text-foreground/90 px-3.5 py-1 font-medium select-none"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {caption}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool-result card — in the body, below the bar (the physical notch only
          covers the top bar), Dynamic-Island style. */}
      <AnimatePresence>
        {hasCard && (
          <motion.div
            key="tool-card"
            className="flex shrink-0 justify-center px-3 pb-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-[360px]">
              <ToolCardLayer invocations={toolInvocations} surface="notch" />
              <button
                type="button"
                tabIndex={-1}
                onClick={onNewConversation}
                aria-label="Dismiss"
                title="Dismiss"
                className="absolute -right-1.5 -top-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur hover:bg-black/60 hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type field — revealed when expanded; the window grows to reveal it. */}
      {canInteract && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className={cn(
            "shrink-0 px-3.5 transition-all duration-200 ease-out",
            expanded ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0",
          )}
        >
          <div
            className="relative flex h-9 w-full items-center rounded-xl bg-white/[0.06] px-3"
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setValue("");
                  setPinned(false);
                  inputRef.current?.blur();
                }
              }}
              className={cn(
                "h-full w-full bg-transparent text-[13px] text-foreground/90 outline-none pr-6",
                value === "" && "caret-transparent",
              )}
              aria-label={`Type to ${agentName || "your assistant"}`}
            />
            {value === "" && (
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span className="inline-block h-[1.05em] w-[2px] animate-caret-blink rounded-[1px] bg-foreground/70" />
                <span>Type to {agentName || "your assistant"}</span>
              </div>
            )}
            <AnimatePresence>
              {hasText && (
                <motion.button
                  type="button"
                  tabIndex={-1}
                  key="clear"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  onClick={() => {
                    setValue("");
                    setPinned(false);
                    inputRef.current?.blur();
                  }}
                  aria-label="Clear and close"
                  className="absolute right-2 grid size-5 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      )}
    </div>
  );
}

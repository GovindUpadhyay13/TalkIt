import { useRef } from "react";
import { MinimalShell } from "../shared/minimal-shell";
import { OverlayTranscript } from "../shared/overlay-transcript";
import { useAmplitudeFrame, ACTIVE_STATES } from "../shared/use-amplitude";
import type { DexThemeProps, DexThemeDef } from "../types";
import type { DexStatus } from "@/lib/dex/state";
import { TalkItSymbol } from "@/components/brand/talkit-logo";

/**
 * Obsidian Lime Voice Visualizer:
 * Dynamic vertical sound-wave bars that dance smoothly with voice amplitude,
 * flanked by the folded-ribbon T-shaped mark in subtle charcoal and lime.
 */
function ObsidianLimeVisualizer({ status, getAmplitude, canPushToTalk, onPushToTalk }: DexThemeProps) {
  const barsRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const isActive = ACTIVE_STATES.has(status);

  // 7 vertical sound-wave bars representing voice interaction
  useAmplitudeFrame(getAmplitude, isActive, (amp) => {
    const container = barsRef.current;
    if (!container) return;
    const bars = container.children;
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i] as HTMLDivElement;
      // Symmetric sound wave curve: center bar is tallest
      const distFromCenter = Math.abs(i - 3) / 3;
      const weight = 1 - distFromCenter * 0.45;
      const dynamicScale = 0.25 + (amp * 1.5 + 0.15 * Math.sin(Date.now() / 180 + i)) * weight;
      const clamped = Math.min(Math.max(dynamicScale, 0.15), 1.8);
      bar.style.transform = `scaleY(${clamped})`;
      bar.style.opacity = String(0.4 + amp * 0.6);
    }

    if (glowRef.current) {
      const glowOpacity = Math.min(0.15 + amp * 0.4, 0.5);
      const glowSpread = 20 + amp * 50;
      glowRef.current.style.boxShadow = `0 0 ${glowSpread}px rgba(197, 244, 103, ${glowOpacity})`;
    }
  });

  const isIdle = status === "idle" || status === "muted" || status === "unsupported";
  const isPending = status === "approval_pending" || status === "paused";
  const isError = status === "error";

  return (
    <div className="relative flex flex-col items-center justify-center p-8" aria-hidden="true">
      {/* Subtle ambient green glow underneath */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute h-40 w-40 rounded-full transition-all duration-300"
        style={{
          boxShadow: isActive
            ? "0 0 45px rgba(197, 244, 103, 0.25)"
            : isPending
              ? "0 0 35px rgba(245, 158, 11, 0.2)"
              : isError
                ? "0 0 35px rgba(244, 63, 94, 0.2)"
                : "0 0 25px rgba(197, 244, 103, 0.08)",
        }}
      />

      {/* Main interaction button / icon */}
      <div
        onClick={onPushToTalk}
        className={`group relative flex h-28 w-28 items-center justify-center rounded-3xl border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
          isActive
            ? "border-primary/60 bg-[#182118] ring-2 ring-primary/30"
            : isPending
              ? "border-amber-500/50 bg-[#241e14] ring-1 ring-amber-500/30"
              : isError
                ? "border-destructive/50 bg-[#241417] ring-1 ring-destructive/30"
                : "border-[#343D34] bg-[#181f18] hover:border-[#C5F467]/40 hover:shadow-[0_0_15px_rgba(197,244,103,0.1)]"
        }`}
      >
        {/* Vertical sound-wave bars representing voice interaction */}
        <div ref={barsRef} className="flex h-12 items-center justify-center gap-1.5 px-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const initialHeight = i === 3 ? "h-10" : i === 2 || i === 4 ? "h-8" : i === 1 || i === 5 ? "h-6" : "h-4";
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-transform duration-75 origin-center ${initialHeight} ${
                  isActive
                    ? "bg-[#C5F467]"
                    : isPending
                      ? "bg-amber-400"
                      : isError
                        ? "bg-destructive"
                        : "bg-[#8AA89A] opacity-60"
                } ${isIdle ? "animate-pulse" : ""}`}
                style={{
                  animationDelay: `${i * 120}ms`,
                  transform: isIdle ? undefined : "scaleY(0.4)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Push-to-talk hint when idle */}
      {isIdle && (
        <span className="mt-3 rounded-full border border-[#343D34] bg-[#181f18]/80 px-3 py-1 text-[11px] font-medium text-[#A4ADA0] backdrop-blur">
          Click or press <kbd className="text-[#C5F467] font-mono">Space</kbd> to talk
        </span>
      )}
    </div>
  );
}

function ObsidianLimeTheme(props: DexThemeProps) {
  return (
    <MinimalShell
      props={props}
      themeId="obsidian-lime"
      visual={<ObsidianLimeVisualizer {...props} />}
      transcript={
        <OverlayTranscript
          turns={props.transcript}
          liveCaption={props.liveCaption}
          toolInvocations={props.toolInvocations}
          variant="bubble"
        />
      }
    />
  );
}

/**
 * Preview icon in the theme selector:
 * Charcoal pill with folded T and vertical lime sound-wave bars.
 */
function ObsidianLimePreview() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[#343D34] bg-[#181f18] px-2 py-1">
      <div className="flex h-3 items-center gap-0.5">
        <span className="h-2 w-0.5 rounded-full bg-[#8AA89A]" />
        <span className="h-3 w-0.5 rounded-full bg-[#C5F467]" />
        <span className="h-2 w-0.5 rounded-full bg-[#8AA89A]" />
      </div>
      <span className="h-1.5 w-1.5 rounded-full bg-[#C5F467] shadow-[0_0_6px_rgba(197,244,103,0.8)]" />
    </div>
  );
}

/**
 * Custom status indicator used by the notch bar when Obsidian Lime is active.
 */
function ObsidianLimeStatusIndicator({ status }: { status: DexStatus }) {
  const isListening = status === "active_listening" || status === "follow_up_listening";
  const isSpeaking = status === "speaking";
  const isPending = status === "approval_pending" || status === "paused";
  const isError = status === "error";

  return (
    <div className="flex items-center gap-1.5" title={status}>
      <div className="flex h-3.5 items-center gap-0.5">
        <span
          className={`w-0.5 rounded-full transition-all ${
            isListening || isSpeaking
              ? "h-3 bg-[#C5F467] animate-pulse"
              : isPending
                ? "h-2 bg-amber-400"
                : isError
                  ? "h-2 bg-destructive"
                  : "h-1.5 bg-[#8AA89A]/70"
          }`}
        />
        <span
          className={`w-0.5 rounded-full transition-all ${
            isListening || isSpeaking
              ? "h-3.5 bg-[#C5F467] animate-pulse"
              : isPending
                ? "h-2.5 bg-amber-400"
                : isError
                  ? "h-2.5 bg-destructive"
                  : "h-2 bg-[#8AA89A]"
          }`}
        />
        <span
          className={`w-0.5 rounded-full transition-all ${
            isListening || isSpeaking
              ? "h-2.5 bg-[#C5F467] animate-pulse"
              : isPending
                ? "h-2 bg-amber-400"
                : isError
                  ? "h-2 bg-destructive"
                  : "h-1.5 bg-[#8AA89A]/70"
          }`}
        />
      </div>
    </div>
  );
}

const theme: DexThemeDef = {
  id: "obsidian-lime",
  label: "Obsidian Lime",
  description: "The official TalkIt theme. Dark charcoal with crisp lime accents and responsive voice waves.",
  order: 1,
  Component: ObsidianLimeTheme,
  Preview: ObsidianLimePreview,
  StatusIndicator: ObsidianLimeStatusIndicator,
};

export default theme;

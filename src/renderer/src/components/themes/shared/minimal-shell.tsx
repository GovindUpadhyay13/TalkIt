import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { ThemeTopBar } from "./theme-top-bar";
import { TextComposer } from "./text-composer";
import type { DexThemeProps } from "../types";

// Shared chrome for the minimalist themes (dot, cursor): a solid background, a
// centred visual, and a borderless transcript that only appears when there's
// something to show — overlaid at the bottom and fading out as lines age.
export function MinimalShell({
  props,
  themeId,
  visual,
  transcript,
  mono,
  hideTranscript,
}: {
  props: DexThemeProps;
  /** Drives the per-theme token palette via [data-dex-theme]. */
  themeId: string;
  visual: ReactNode;
  transcript?: ReactNode;
  mono?: boolean;
  /** Suppress the bottom transcript overlay (e.g. the cursor theme types it inline). */
  hideTranscript?: boolean;
}) {
  const {
    name,
    status,
    unsupported,
    canPushToTalk,
    onPushToTalk,
    briefingActive,
    isMuted,
    toggleMute,
  } = props;
  const hasTranscript =
    !hideTranscript &&
    (props.transcript.length > 0 ||
      props.liveCaption.length > 0 ||
      props.toolInvocations.length > 0);

  return (
    <div
      data-dex-theme={themeId}
      className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground ${
        mono ? "font-mono" : ""
      }`}
    >
      <ThemeTopBar
        name={name}
        status={status}
        onOpenSettings={props.onOpenSettings}
        onMinimize={props.onMinimize}
        onNewConversation={props.onNewConversation}
        isMuted={isMuted}
        onToggleMute={unsupported || status === "error" ? undefined : toggleMute}
      />

      <section className="z-10 flex flex-col items-center gap-4 max-w-xl text-center px-4">
        <button
          type="button"
          onClick={onPushToTalk}
          className="group flex flex-col items-center gap-1.5 cursor-pointer outline-none transition active:scale-95"
          title="Click to talk (or press Space)"
        >
          {visual}
          <span className="text-[11px] font-mono tracking-wider text-muted-foreground/80 transition group-hover:text-primary">
            {status === "active_listening"
              ? "● LISTENING..."
              : status === "thinking"
                ? "◐ THINKING..."
                : status === "speaking"
                  ? "🔊 SPEAKING..."
                  : "CLICK MIC OR SPEAK"}
          </span>
        </button>

        {!hasTranscript && (
          <div className="flex flex-col items-center gap-2.5 mt-2 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#343D34] bg-[#181f18] px-3 py-1 text-[11px] font-medium text-[#C5F467] shadow-sm">
              <Sparkles className="size-3" />
              <span>Powered by Google Gemini</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-1.5">
              {[
                { label: "🌤️ What's the weather?", prompt: "What is the weather forecast right now?" },
                { label: "🌐 Search the web", prompt: "Search the web for the latest artificial intelligence news" },
                { label: "💻 Open browser", prompt: "Open my web browser" },
                { label: "📝 Take a note", prompt: "Take a quick note: Review project deliverables today" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => props.onSubmitText(item.prompt)}
                  className="rounded-full border border-[#343D34] bg-[#181f18]/90 px-3.5 py-1.5 text-xs text-[#A4ADA0] hover:border-[#C5F467]/60 hover:bg-[#202920] hover:text-[#F2F5ED] hover:shadow-[0_0_12px_rgba(197,244,103,0.15)] transition-all cursor-pointer active:scale-95"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {briefingActive && (
          <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Pulling up your dashboards…
          </div>
        )}

        {unsupported && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Web Speech recognition is unavailable in this environment. Pick Local Whisper or Google Gemini in Settings → Voice input.
          </p>
        )}
      </section>

      {/* Borderless transcript overlay — only when there's content, fading up. */}
      {hasTranscript && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center">
          <div
            className="flex max-h-[42vh] w-full max-w-2xl flex-col justify-end overflow-hidden px-6 pb-4"
            style={{
              maskImage:
                "linear-gradient(to top, black 0%, black 55%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, black 0%, black 55%, transparent 100%)",
            }}
          >
            {transcript}
          </div>
        </div>
      )}

      {/* Concealed typing affordance — voice-first, type when you can't speak. */}
      <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
        <TextComposer onSubmit={props.onSubmitText} />
      </div>
    </div>
  );
}

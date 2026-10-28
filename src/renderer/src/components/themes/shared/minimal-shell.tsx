import { useState, useEffect, type ReactNode } from "react";
import { Sparkles, Zap, Code2, Copy, Check, Play, Pause, GitCommit, Search, ListOrdered } from "lucide-react";
import { ThemeTopBar } from "./theme-top-bar";
import { TextComposer } from "./text-composer";
import { DeveloperCompanion } from "@/components/developer/DeveloperCompanion";
import { cn } from "@/lib/utils";
import type { DexThemeProps } from "../types";

// Shared chrome for the minimalist themes (dot, cursor, obsidian-lime):
// Includes Wispr Flow inspired mode dock, quick utility buttons, and Obsidian Lime styling.
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

  const [copied, setCopied] = useState(false);
  const [devEnabled, setDevEnabled] = useState(false);
  const [gitPushing, setGitPushing] = useState(false);
  const [gitPushResult, setGitPushResult] = useState<string | null>(null);
  const [showDevCompanion, setShowDevCompanion] = useState(false);

  useEffect(() => {
    if (window.opendex?.devMode) {
      window.opendex.devMode
        .getState()
        .then((s) => setDevEnabled(s.enabled))
        .catch(console.error);
      return window.opendex.devMode.onStateChanged((s) => setDevEnabled(s.enabled));
    }
  }, []);

  const lastText =
    props.liveCaption ||
    props.spokenCaption ||
    (props.transcript.length > 0 ? props.transcript[props.transcript.length - 1].content : "");

  const handleCopyLast = async () => {
    if (!lastText) return;
    try {
      await navigator.clipboard.writeText(lastText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.warn("Failed to copy:", err);
    }
  };

  const handlePauseResume = () => {
    if (status === "writing") {
      props.onSubmitText("Whisper wait");
    } else if (status === "paused") {
      props.onSubmitText("TalkIt continue");
    }
  };

  const handleGitPush = async () => {
    if (!window.opendex?.devMode?.gitPush) return;
    try {
      setGitPushing(true);
      setGitPushResult(null);
      const res = await window.opendex.devMode.gitPush();
      if (res.ok) {
        setGitPushResult(res.commitHash ? `Pushed ${res.commitHash}` : "Pushed!");
        setTimeout(() => setGitPushResult(null), 3500);
      } else {
        setGitPushResult(`Failed: ${res.error || "error"}`);
        setTimeout(() => setGitPushResult(null), 3500);
      }
    } catch {
      setGitPushResult("Push failed");
      setTimeout(() => setGitPushResult(null), 3500);
    } finally {
      setGitPushing(false);
    }
  };

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
        isExecutionMode={props.isExecutionMode}
        onToggleExecutionMode={props.onToggleExecutionMode}
      />

      <section className="z-10 flex flex-col items-center gap-4 max-w-xl text-center px-4">
        {/* Main Mic / Sound-Wave Visualizer Button */}
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
                  : status === "writing"
                    ? "✍️ TRANSCRIBING (WISPR FLOW)..."
                    : status === "paused"
                      ? "⏸️ WHISPER PAUSED (CLICK TO RESUME)..."
                      : "CLICK MIC OR SPEAK"}
          </span>
        </button>

        {/* Wispr Flow Inspired Mode Switcher Dock */}
        <div className="flex items-center gap-1.5 rounded-full border border-[#343D34] bg-[#141914]/90 p-1 backdrop-blur shadow-xl transition-all">
          {/* Write Mode (Wispr Flow continuous dictation) */}
          <button
            type="button"
            onClick={() => props.onToggleExecutionMode?.(false)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer select-none",
              !props.isExecutionMode
                ? "bg-[#C5F467]/15 text-[#C5F467] border border-[#C5F467]/40 font-semibold shadow-[0_0_12px_rgba(197,244,103,0.2)]"
                : "text-[#8AA89A] hover:text-[#F2F5ED] hover:bg-[#1f261f]"
            )}
            title="Write Mode: Continuous Wispr Flow voice dictation directly into any active application"
          >
            <span className="text-sm">✍️</span>
            <span>Write Mode</span>
          </button>

          {/* Execute Mode (Direct desktop commands & apps) */}
          <button
            type="button"
            onClick={() => props.onToggleExecutionMode?.(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer select-none",
              props.isExecutionMode
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                : "text-[#8AA89A] hover:text-[#F2F5ED] hover:bg-[#1f261f]"
            )}
            title="Execute Mode: Direct desktop automation (launch apps, calculator, Google search)"
          >
            <Zap className={cn("size-3.5", props.isExecutionMode ? "text-amber-400" : "text-[#8AA89A]")} />
            <span>Execute Mode</span>
          </button>

          {/* Developer Companion (Antigravity observer) */}
          <button
            type="button"
            onClick={() => setShowDevCompanion(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer select-none",
              devEnabled
                ? "bg-lime-400/15 text-lime-300 border border-lime-400/40 font-semibold shadow-[0_0_12px_rgba(197,244,103,0.15)]"
                : "text-[#8AA89A] hover:text-[#F2F5ED] hover:bg-[#1f261f]"
            )}
            title="Developer Mode: Background Antigravity session companion, Catch Me Up, and Git Sync"
          >
            <Code2 className={cn("size-3.5", devEnabled ? "text-lime-400" : "text-[#8AA89A]")} />
            <span>Dev Companion</span>
          </button>
        </div>

        {/* Wispr Flow Action Deck (Relevant utility buttons) */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg pt-1">
          {/* Copy Last Dictation Text */}
          <button
            type="button"
            onClick={handleCopyLast}
            disabled={!lastText}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono transition-all select-none",
              copied
                ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : lastText
                  ? "border-[#343D34] bg-[#181f18]/80 text-[#A4ADA0] hover:border-[#C5F467]/50 hover:text-[#F2F5ED] cursor-pointer active:scale-95"
                  : "border-[#343D34]/40 bg-[#181f18]/40 text-[#A4ADA0]/40 cursor-not-allowed"
            )}
            title="Copy latest voice transcription to clipboard"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>{copied ? "Copied!" : "Copy Last"}</span>
          </button>

          {/* Pause / Resume for Wispr Flow Continuous dictation */}
          {(status === "writing" || status === "paused") && (
            <button
              type="button"
              onClick={handlePauseResume}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
              title={status === "writing" ? "Pause dictation (Whisper wait)" : "Resume dictation (TalkIt continue)"}
            >
              {status === "writing" ? <Pause className="size-3" /> : <Play className="size-3" />}
              <span>{status === "writing" ? "Whisper Wait" : "TalkIt Continue"}</span>
            </button>
          )}

          {/* Developer Mode: 5-Line Catch Up */}
          {devEnabled && (
            <button
              type="button"
              onClick={() => props.onSubmitText("catch me up")}
              className="flex items-center gap-1.5 rounded-full border border-lime-500/40 bg-lime-500/10 px-3 py-1.5 text-xs font-mono text-lime-300 hover:bg-lime-500/20 transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(197,244,103,0.1)]"
              title="Get a strictly 5-line summary of verified progress and blockers"
            >
              <Sparkles className="size-3 text-lime-400" />
              <span>5-Line Catch Up</span>
            </button>
          )}

          {/* Developer Mode: 10-Line Plan */}
          {devEnabled && (
            <button
              type="button"
              onClick={() => props.onSubmitText("give me the implementation plan")}
              className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-mono text-sky-300 hover:bg-sky-500/20 transition-all cursor-pointer active:scale-95"
              title="Get a strictly 10-line evidence-grounded implementation plan"
            >
              <ListOrdered className="size-3 text-sky-400" />
              <span>10-Line Plan</span>
            </button>
          )}

          {/* Developer Mode: Direct Push to GitHub */}
          {devEnabled && (
            <button
              type="button"
              onClick={handleGitPush}
              disabled={gitPushing}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono transition-all active:scale-95",
                gitPushResult
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "border-[#343D34] bg-[#181f18]/80 text-[#C5F467] hover:border-[#C5F467]/60 hover:bg-[#202920] cursor-pointer"
              )}
              title="Directly stage all files, commit, and push to GitHub"
            >
              <GitCommit className={cn("size-3", gitPushing && "animate-spin text-lime-400")} />
              <span>{gitPushing ? "Pushing..." : gitPushResult || "Push to GitHub"}</span>
            </button>
          )}

          {/* Quick Google Search Trigger */}
          <button
            type="button"
            onClick={() => {
              props.onToggleExecutionMode?.(true);
              props.onSubmitText("search on google for latest tech news");
            }}
            className="flex items-center gap-1.5 rounded-full border border-[#343D34] bg-[#181f18]/80 px-3 py-1.5 text-xs font-mono text-[#A4ADA0] hover:border-[#C5F467]/50 hover:text-[#F2F5ED] hover:bg-[#202920] transition-all cursor-pointer active:scale-95"
            title="Execute a direct Google search in Execute Mode"
          >
            <Search className="size-3 text-[#8AA89A]" />
            <span>Search Web</span>
          </button>
        </div>

        {/* Quick Suggestion Prompts when idle without transcript */}
        {!hasTranscript && (
          <div className="flex flex-col items-center gap-2 mt-2 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#343D34] bg-[#181f18] px-3 py-1 text-[11px] font-medium text-[#C5F467] shadow-sm">
              <Sparkles className="size-3" />
              <span>Powered by Google Gemini & Gemma</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-1">
              {[
                { label: "🌤️ What's the weather?", prompt: "What is the weather forecast right now?" },
                { label: "🌐 Search the web", prompt: "Search on google for the latest artificial intelligence news" },
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

        {status === "error" && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-3 text-center max-w-md animate-fade-in shadow-lg">
            <p className="text-xs text-destructive-foreground font-medium">
              Google Gemini API key required or action failed. Please configure your GEMINI_API_KEY in Settings.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={props.onOpenSettings}
                className="rounded-full bg-destructive text-destructive-foreground px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm"
              >
                Open Settings (⚙️)
              </button>
              {props.onNewConversation && (
                <button
                  type="button"
                  onClick={props.onNewConversation}
                  className="rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              )}
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

      {/* Developer Companion Modal */}
      <DeveloperCompanion
        isOpen={showDevCompanion}
        onClose={() => setShowDevCompanion(false)}
      />
    </div>
  );
}

import { useState } from "react";
import type {
  DeepPartial,
  LlmProvider,
  OpenDexConfig,
  PublicConfig,
  SecretName,
} from "../../../../main/config/schema";
import {
  SecretField,
  SegmentedControl,
  SelectField,
  TextArea,
  TextField,
} from "../ui/fields";
import {
  ProviderPicker,
  defaultModelFor,
  isProviderReady,
  useAppleAvailability,
} from "@/components/llm/provider-picker";
import { useSystemVoices } from "@/lib/use-system-voices";
import { ThemePicker } from "@/components/themes/theme-picker";
import {
  REALTIME_MODELS,
  getRealtimeModelMeta,
} from "../../../../main/config/realtime-models";
import {
  AudioWaveform,
  CheckCircle2,
  Cpu,
  Dot,
  ExternalLink,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from "lucide-react";

const LOCAL_GEMMA_MODELS = [
  { value: "gemma3:4b", label: "Gemma 3 (4B) — Recommended" },
  { value: "gemma3:1b", label: "Gemma 3 (1B) — Fast / Low Resource" },
  { value: "gemma3:12b", label: "Gemma 3 (12B) — High Accuracy" },
  { value: "gemma2:9b", label: "Gemma 2 (9B)" },
  { value: "gemma2:2b", label: "Gemma 2 (2B)" },
];

const GEMINI_API_GEMMA_MODELS = [
  { value: "gemma-4-26b-a4b-it", label: "Gemma 4 (26B-A4B-IT) — Multimodal & Thinking" },
  { value: "gemma-4-31b-it", label: "Gemma 4 (31B-IT) — High Capacity Reasoning" },
  { value: "gemma-2-27b-it", label: "Gemma 2 (27B-IT)" },
  { value: "gemma-2-9b-it", label: "Gemma 2 (9B-IT)" },
];

interface Step {
  key: string;
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
}

/** One selectable card in the voice-mode fork step. */
function VoiceModeCard({
  selected,
  onSelect,
  Icon,
  title,
  blurb,
}: {
  selected: boolean;
  onSelect: () => void;
  Icon: typeof AudioWaveform;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-white/60 bg-white/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-white/70" />
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-white/50">{blurb}</span>
      </span>
    </button>
  );
}

/** Inline, auto-sizing name field rendered mid-sentence ("…my name is Dex").
 *  The bright text, dashed underline, blinking caret (autofocus) and pencil all
 *  signal it's editable without a separate label. */
function EditableName({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="relative inline-flex items-center align-baseline">
      <input
        spellCheck={false}
        aria-label="Assistant name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        className="[field-sizing:content] min-w-[1ch] max-w-[10ch] border-b-2 border-dashed border-white/40 bg-transparent text-center font-semibold text-white caret-white outline-none transition-colors focus:border-solid focus:border-white"
      />
      <Pencil className="pointer-events-none ml-1.5 size-4 text-white/40" />
    </span>
  );
}

export function OnboardingWizard({
  data,
  setConfig,
  setSecret,
  onComplete,
}: {
  data: PublicConfig;
  setConfig: (patch: DeepPartial<OpenDexConfig>) => void;
  setSecret: (name: SecretName, value: string) => void;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  // No default provider: start with none chosen so the user makes a deliberate
  // pick before continuing past the model step.
  const [chosenProvider, setChosenProvider] = useState<LlmProvider | null>(null);
  const apple = useAppleAvailability();
  const { config, secrets } = data;
  const voices = useSystemVoices();

  const steps: Step[] = [
    {
      key: "engine",
      title: "Choose Gemma Engine",
      subtitle: "Select how Talkit should process your requests with Google Gemma.",
      render: () => {
        const isLocal = config.llm.provider === "gemma";
        const isCloud = config.llm.provider === "gemini-gemma";
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Run Locally */}
              <button
                type="button"
                onClick={() => {
                  setConfig({
                    llm: {
                      provider: "gemma",
                      model: isLocal && config.llm.model ? config.llm.model : "gemma3:4b",
                    },
                  });
                }}
                className={`flex flex-col text-left p-4 rounded-xl border transition relative ${
                  isLocal
                    ? "border-emerald-500/80 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Cpu className={`size-5 ${isLocal ? "text-emerald-400" : "text-white/60"}`} />
                    <span className="font-semibold text-white text-sm">Run Locally</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    Ollama
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  Run Google Gemma locally on your PC via Ollama. 100% private, free, and offline.
                </p>
                {isLocal && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Selected</span>
                  </div>
                )}
              </button>

              {/* Option 2: Cloud API */}
              <button
                type="button"
                onClick={() => {
                  setConfig({
                    llm: {
                      provider: "gemini-gemma",
                      model: isCloud && config.llm.model ? config.llm.model : "gemma-4-26b-a4b-it",
                    },
                  });
                }}
                className={`flex flex-col text-left p-4 rounded-xl border transition relative ${
                  isCloud
                    ? "border-sky-500/80 bg-sky-500/10 ring-1 ring-sky-500/50"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`size-5 ${isCloud ? "text-sky-400" : "text-white/60"}`} />
                    <span className="font-semibold text-white text-sm">Gemini API</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                    Cloud
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  Hosted Gemma 4 models on Gemini API with multimodal vision & thinking reasoning.
                </p>
                {isCloud && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-sky-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Selected</span>
                  </div>
                )}
              </button>
            </div>

            {/* Config panel for the selected mode */}
            {isLocal && (
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 mt-1">
                <SelectField
                  label="Local Gemma Model"
                  hint="Select which Gemma model to run via Ollama."
                  value={config.llm.model || "gemma3:4b"}
                  options={LOCAL_GEMMA_MODELS}
                  onChange={(v) => setConfig({ llm: { ...config.llm, model: v } })}
                />
                <TextField
                  label="Ollama Base URL"
                  hint="Local Ollama endpoint (starts automatically with 'ollama serve')."
                  value={config.llm.ollamaBaseUrl || "http://127.0.0.1:11434/v1"}
                  onChange={(v) => setConfig({ llm: { ...config.llm, ollamaBaseUrl: v } })}
                />
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/40 mb-1">
                    <Terminal className="size-3.5" />
                    <span>Pull & run model via Ollama</span>
                  </div>
                  <code className="text-emerald-400 font-mono text-xs">
                    ollama run {config.llm.model || "gemma3:4b"}
                  </code>
                </div>
              </div>
            )}

            {isCloud && (
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 mt-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">Google Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <SecretField
                    label=""
                    hint="Obtain your API key from Google AI Studio. Free tier is supported."
                    present={secrets.GEMINI_API_KEY}
                    onSave={(v) => setSecret("GEMINI_API_KEY", v)}
                  />
                  {!secrets.GEMINI_API_KEY && (
                    <p className="text-[11px] text-amber-400/90 font-medium">
                      ⚠️ Please enter and save your Gemini API key above to continue.
                    </p>
                  )}
                </div>

                <SelectField
                  label="Hosted Gemma 4 Model"
                  hint="Select which Google Gemma model to query via the Gemini API."
                  value={config.llm.model || "gemma-4-26b-a4b-it"}
                  options={GEMINI_API_GEMMA_MODELS}
                  onChange={(v) => setConfig({ llm: { ...config.llm, model: v } })}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "welcome",
      title: "",
      subtitle: "",
      render: () => (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
          <Dot className="size-24 text-white animate-pulse" />
          <p className="text-3xl font-medium leading-relaxed text-white/45">
            Hi, I'm {" "}
            <EditableName
              value={config.assistant.name}
              onChange={(v) => setConfig({ assistant: { name: v, wakeWord: v } })}
            />
          </p>
          <p className="text-xs text-white/20">You can rename me anytime in Settings.</p>
        </div>
      ),
    },
    {
      key: "voicemode",
      title: "How conversations run",
      subtitle: "Two ways to talk to Talkit — you can switch anytime in Settings.",
      render: () => (
        <div className="flex flex-col gap-3">
          <VoiceModeCard
            selected={config.voice.mode === "pipeline"}
            onSelect={() => setConfig({ voice: { mode: "pipeline" } })}
            Icon={SlidersHorizontal}
            title="Classic pipeline"
            blurb="Separate wake word, transcription, language model, and voice. Free, offline options for every stage, and full control over each."
          />
          <VoiceModeCard
            selected={config.voice.mode === "realtime"}
            onSelect={() => setConfig({ voice: { mode: "realtime" } })}
            Icon={AudioWaveform}
            title="Realtime voice"
            blurb="One speech-to-speech model listens and answers in its own voice — the most natural conversations and the fastest turns. Needs a Vercel AI Gateway key; screen control still runs through your language model."
          />
        </div>
      ),
    },
    ...(config.voice.mode === "realtime"
      ? [
          {
            key: "realtime",
            title: "Realtime voice",
            subtitle: "The model that listens and speaks, and how a conversation starts.",
            render: () => {
              const realtimeMeta = getRealtimeModelMeta(config.realtime.model);
              return (
                <>
                  <SecretField
                    label="Vercel AI Gateway key"
                    hint="Realtime sessions connect through the gateway (same key as the gateway model provider)."
                    present={secrets.AI_GATEWAY_API_KEY}
                    onSave={(v) => setSecret("AI_GATEWAY_API_KEY", v)}
                  />
                  <SelectField
                    label="Realtime model"
                    hint={realtimeMeta?.blurb}
                    value={config.realtime.model}
                    options={REALTIME_MODELS.map((m) => ({ value: m.id, label: m.label }))}
                    onChange={(v) => {
                      const meta = getRealtimeModelMeta(v);
                      setConfig({
                        realtime: {
                          ...config.realtime,
                          model: v,
                          voice: meta?.voices[0]?.id ?? "",
                        },
                      });
                    }}
                  />
                  {realtimeMeta && realtimeMeta.voices.length > 0 && (
                    <SelectField
                      label="Voice"
                      value={config.realtime.voice}
                      options={realtimeMeta.voices.map((v) => ({
                        value: v.id,
                        label: v.label,
                      }))}
                      onChange={(v) =>
                        setConfig({ realtime: { ...config.realtime, voice: v } })
                      }
                    />
                  )}
                  <SelectField
                    label="How a conversation starts"
                    hint="The wake word (or push-to-talk) connects a session; it hangs up after a stretch of silence."
                    value={config.voiceInput.wakeMode}
                    options={[
                      { value: "manual", label: "Push to talk (click / ⌘⇧Space)" },
                      { value: "vosk", label: "Wake word (Vosk — free, offline)" },
                      { value: "webspeech", label: "Wake word (Web Speech)" },
                    ]}
                    onChange={(v) =>
                      setConfig({ voiceInput: { ...config.voiceInput, wakeMode: v } })
                    }
                  />
                  <p className="text-xs text-white/40">
                    Sessions are billed by the provider and capped at twenty-five
                    minutes — the wake word reconnects seamlessly.
                  </p>
                </>
              );
            },
          } satisfies Step,
        ]
      : [
    {
      key: "voice",
      title: "Voice",
      subtitle: "How TalkIt speaks back to you.",
      render: () => (
        <>
          <SegmentedControl
            value={config.tts.engine}
            options={[
              { value: "elevenlabs", label: "ElevenLabs" },
              { value: "system", label: "System voice (free)" },
            ]}
            onChange={(v) => setConfig({ tts: { engine: v } })}
          />
          {config.tts.engine === "elevenlabs" ? (
            <>
              <SecretField
                label="ElevenLabs API key"
                present={secrets.ELEVENLABS_API_KEY}
                onSave={(v) => setSecret("ELEVENLABS_API_KEY", v)}
              />
              <TextField
                label="Voice ID"
                hint="Defaults to a deep British voice (George)."
                value={config.tts.elevenLabs.voiceId}
                onChange={(v) =>
                  setConfig({ tts: { elevenLabs: { ...config.tts.elevenLabs, voiceId: v } } })
                }
              />
            </>
          ) : (
            <SelectField
              label="System voice"
              hint={voices.length ? "Uses your operating system's built-in speech — no API key needed." : "Loading voices…"}
              value={config.tts.system.voiceURI ?? ""}
              options={[
                { value: "", label: "Default" },
                ...voices.map((v) => ({ value: v.voiceURI, label: v.label })),
              ]}
              onChange={(v) =>
                setConfig({ tts: { system: { ...config.tts.system, voiceURI: v || null } } })
              }
            />
          )}
        </>
      ),
    },
    {
      key: "voiceinput",
      title: "Voice input",
      subtitle: "How you start talking, and how speech is transcribed.",
      render: () => (
        <>
          <SelectField
            label="How to start listening"
            hint="Push-to-talk and Vosk need no paid key."
            value={config.voiceInput.wakeMode}
            options={[
              { value: "manual", label: "Push to talk (click / ⌘⇧Space)" },
              { value: "vosk", label: "Wake word (Vosk — free, offline)" },
              { value: "webspeech", label: "Wake word (Web Speech)" },
            ]}
            onChange={(v) => setConfig({ voiceInput: { ...config.voiceInput, wakeMode: v } })}
          />
          <SelectField
            label="Transcription"
            hint="Local options are free + offline (one-time model download)."
            value={config.voiceInput.sttProvider}
            options={[
              { value: "whisper-local", label: "Local Whisper (free, offline)" },
              { value: "vosk-local", label: "Local Vosk (free, offline)" },
              { value: "openai", label: "OpenAI Whisper (cloud)" },
              { value: "webspeech", label: "Web Speech (browser)" },
            ]}
            onChange={(v) => setConfig({ voiceInput: { ...config.voiceInput, sttProvider: v } })}
          />
          {config.voiceInput.sttProvider === "openai" && (
            <SecretField
              label="OpenAI API key"
              present={secrets.OPENAI_API_KEY}
              onSave={(v) => setSecret("OPENAI_API_KEY", v)}
            />
          )}
        </>
      ),
    },
        ]),
    {
      key: "appearance",
      title: "Voice visualization",
      subtitle: "Pick how Talkit appears while listening and speaking.",
      render: () => (
        <ThemePicker
          value={config.appearance.theme}
          onChange={(id) => setConfig({ appearance: { theme: id } })}
        />
      ),
    },
    {
      key: "greeting",
      title: "Greeting",
      subtitle: "What Talkit says the first time you wake it each session.",
      render: () => (
        <>
          <SelectField
            label="Proactive greeting"
            value={config.greeting.mode}
            options={[
              { value: "example", label: "Example briefing (demo)" },
              { value: "custom", label: "Custom prompt" },
              { value: "none", label: "None — just listen" },
            ]}
            onChange={(v) => setConfig({ greeting: { ...config.greeting, mode: v } })}
          />
          {config.greeting.mode === "custom" && (
            <TextArea
              label="Custom greeting prompt"
              hint="What should it say? Include any context you want it to use."
              value={config.greeting.customPrompt}
              placeholder="e.g. Greet me by name, then summarise today's priorities…"
              onChange={(v) => setConfig({ greeting: { ...config.greeting, customPrompt: v } })}
            />
          )}
          {config.greeting.mode === "example" && (
            <p className="text-xs text-white/40">
              Ships with a sample product-metrics briefing so you can hear the
              capability immediately. Swap to a custom prompt anytime.
            </p>
          )}
        </>
      ),
    },
  ];

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  // Block advancing past the engine step until configured,
  // and past the realtime step until the gateway key is saved.
  const isEngineReady =
    config.llm.provider === "gemma"
      ? Boolean(config.llm.model)
      : config.llm.provider === "gemini-gemma"
        ? Boolean(secrets.GEMINI_API_KEY && config.llm.model)
        : false;

  const blocked =
    (step.key === "engine" && !isEngineReady) ||
    (step.key === "llm" && !isProviderReady(data, chosenProvider, apple)) ||
    (step.key === "realtime" && !secrets.AI_GATEWAY_API_KEY);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111411] p-0 md:p-6">
      {/* Frameless title bar: a draggable strip across the top, inset from the
          corner controls (brand mark, settings gear) so they stay clickable. */}
      {window.opendex.platform === "darwin" && (
        <div className="titlebar-drag fixed inset-x-[72px] top-0 z-30 h-9" />
      )}

      <div className="flex w-full h-full md:h-auto md:max-h-[85vh] md:max-w-md flex-1 flex-col gap-5 overflow-hidden px-6 pt-6 md:rounded-2xl md:border md:border-[#343D34] md:bg-[#222922] md:px-7 md:pt-7 md:shadow-2xl">
        <div className="flex gap-1.5 mt-8 md:mt-0">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? "bg-[#C5F467]" : "bg-[#343D34]"
              }`}
            />
          ))}
        </div>

        {step.title && (
          <div>
            <h2 className="text-xl font-semibold text-[#F2F5ED]">{step.title}</h2>
            <p className="mt-1 text-sm text-[#A4ADA0]">{step.subtitle}</p>
          </div>
        )}

        {/* Scrollable body with an overlaid, blurred bottom bar: content scrolls
            *under* the bar, which stays pinned to the bottom of the card. */}
        <div className="relative -mx-6 min-h-0 flex-1 md:-mx-7">
          <div className="h-full overflow-y-auto px-6 pb-20 md:px-7">
            <div className="flex flex-1 min-h-full flex-col gap-4">{step.render()}</div>
          </div>

          {/* Fade so scrolling content dissolves into the bar instead of clipping. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[64px] h-10 bg-gradient-to-t from-[#111411] to-transparent md:from-[#222922]" />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-[#343D34] bg-[#111411]/80 px-6 py-4 backdrop-blur-md md:bg-[#222922]/90 md:px-7">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="rounded-full px-4 py-2 text-sm text-[#A4ADA0] transition enabled:hover:text-[#F2F5ED] disabled:opacity-0"
            >
              Back
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={() => (isLast ? onComplete() : setStepIndex((i) => i + 1))}
              className="rounded-full bg-[#C5F467] px-6 py-2 text-sm font-semibold text-[#111411] transition hover:bg-[#C5F467]/90 hover:shadow-[0_0_12px_rgba(197,244,103,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLast ? "Start using TalkIt" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

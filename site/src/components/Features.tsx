const FEATURES = [
  {
    title: "Voice-first loop",
    body: "Wake word → listen → think (with tools) → speak. Natural follow-ups, push-to-talk, plus opt-in barge-in to interrupt mid-reply.",
  },
  {
    title: "Google Gemma Powered",
    body: "Optimized for Google Gemma models (hosted on Gemini API or local via Ollama) with fast, intelligent voice reasoning.",
  },
  {
    title: "Obsidian Lime Aesthetic",
    body: "A bespoke dark theme featuring amplitude-reactive vertical voice wave bars, elevated obsidian surfaces, and sharp lime accents.",
  },
  {
    title: "Free & offline option",
    body: "Vosk wake word + local Whisper transcription (WASM, no signup) and system TTS. Your audio stays on your machine.",
  },
  {
    title: "Pluggable voice I/O",
    body: "Wake via push-to-talk or Vosk; transcribe locally or in the cloud; speak via ElevenLabs or your operating system's built-in voice.",
  },
  {
    title: "Agentic skills, gated",
    body: "TalkIt takes real actions (launching apps, system control, web tasks). Sensitive tasks hit an Allow once / Always / Deny gate.",
  },
  {
    title: "Computer-use (opt-in)",
    body: "Let TalkIt inspect your screen and drive mouse & keyboard to operate complex desktop apps behind your strict permission gate.",
  },
  {
    title: "Secure by design",
    body: "API keys are encrypted with your OS keychain and live only in the main process — never exposed to the UI.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-[#343D34] bg-[#141914]">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#8AA89A]">
          What it does
        </h2>
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className="flex gap-5">
              <span className="font-mono text-sm font-bold text-[#C5F467]/75">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-bold text-[#F2F5ED]">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#A4ADA0]">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    tag: "Write Mode",
    title: "Wispr Flow Voice Typing",
    body: "Seamless continuous dictation directly into any active application or editor. Includes natural voice pause ('Whisper wait') and instant resume ('TalkIt continue') without cluttering your text.",
  },
  {
    tag: "Execute Mode",
    title: "Direct Desktop Actions & Web Search",
    body: "Instantly launch Windows apps (Calculator, Notepad, Terminal, Settings) and perform fast Google searches directly without waiting on cloud LLM round-trips.",
  },
  {
    tag: "Developer Mode",
    title: "Background Development Companion",
    body: "Ambient coding observer for Antigravity and local IDEs. Request on-demand 'Catch me up' briefings and implementation plans strictly grounded in verified session evidence.",
  },
  {
    tag: "Intelligence",
    title: "Google Gemma & Gemini Powered",
    body: "Engineered for Google Gemma (local via Ollama or cloud Gemini API) for high-speed voice reasoning, conversational planning, and multi-turn workflows.",
  },
  {
    tag: "Interface",
    title: "Unified Top Notch Bar",
    body: "A discreet, transparent bar pinned to the top of your screen with an amplitude-reactive audio wave, live transcript, and mode indicators that never disrupt your focus.",
  },
  {
    tag: "Control",
    title: "Strict Permission Gating",
    body: "TalkIt executes real system actions and coding operations safely. Privileged tasks require explicit user confirmation through an Allow Once / Always / Deny gate.",
  },
  {
    tag: "Interaction",
    title: "Voice-First Hands-Free Loop",
    body: "Wake word activation ('Hey TalkIt'), push-to-talk hotkeys, intelligent follow-up listening, and instant mid-reply barge-in to interrupt replies.",
  },
  {
    tag: "Privacy",
    title: "Private & Secure by Design",
    body: "Zero audio leakage with offline wake words (Vosk) and local speech-to-text options. All API credentials remain securely encrypted in your OS keychain.",
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
            <div key={feature.title} className="flex gap-5 group">
              <span className="font-mono text-sm font-bold text-[#C5F467]/75">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#F2F5ED]">{feature.title}</h3>
                  {feature.tag && (
                    <span className="rounded bg-[#C5F467]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#C5F467] border border-[#C5F467]/20">
                      {feature.tag}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[#A4ADA0]">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const THEMES = [
  {
    name: "Obsidian Lime",
    badge: "Flagship / Default",
    desc: "Amplitude-reactive vertical voice bars on deep charcoal surfaces with vibrant lime accents.",
    preview: (
      <div className="flex h-full w-full flex-col justify-between p-5 bg-[#111411]">
        <div className="flex items-center justify-between border-b border-[#343D34]/70 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8AA89A]">Obsidian Lime</span>
          <span className="h-2 w-2 rounded-full bg-[#C5F467] shadow-[0_0_8px_#C5F467]" />
        </div>
        <div className="my-auto flex items-center justify-center gap-2">
          <span className="h-4 w-1.5 rounded-full bg-[#C5F467]/50" />
          <span className="h-8 w-1.5 rounded-full bg-[#C5F467]/80" />
          <span className="h-12 w-1.5 rounded-full bg-[#C5F467] shadow-[0_0_12px_#C5F467]" />
          <span className="h-16 w-1.5 rounded-full bg-[#C5F467] shadow-[0_0_16px_#C5F467]" />
          <span className="h-10 w-1.5 rounded-full bg-[#C5F467]/80" />
          <span className="h-6 w-1.5 rounded-full bg-[#C5F467]/60" />
          <span className="h-3 w-1.5 rounded-full bg-[#C5F467]/40" />
        </div>
        <div className="rounded-lg border border-[#343D34] bg-[#222922] px-3 py-1.5 text-center font-mono text-[11px] text-[#A4ADA0]">
          Listening…
        </div>
      </div>
    ),
  },
  {
    img: "./screenshots/jarvis.png",
    alt: "Jarvis HUD theme",
    name: "Jarvis HUD",
    desc: "Cyan Stark-style holographic heads-up display with circular voice reactive rings.",
  },
  {
    img: "./screenshots/typing-cursor.png",
    alt: "Typing Cursor theme",
    name: "Typing Cursor",
    desc: "Minimal retro monospace terminal caret for distraction-free focused typing.",
  },
];

export function Themes() {
  return (
    <section id="themes" className="border-t border-[#343D34] bg-[#111411]">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#8AA89A]">
          Pick your interface
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A4ADA0]">
          A theme renders the entire experience — audio visualizer, transcript, action cards, and controls.
          TalkIt defaults to Obsidian Lime, but you can switch themes at any time in Settings.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <figure key={theme.name} className="flex flex-col">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#343D34] bg-[#181f18] transition hover:border-[#C5F467]/50">
                {theme.preview ? (
                  theme.preview
                ) : (
                  <img
                    src={theme.img}
                    alt={theme.alt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
                {theme.badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#C5F467] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#111411]">
                    {theme.badge}
                  </span>
                )}
              </div>
              <figcaption className="mt-3.5 flex flex-col">
                <span className="font-bold text-[#F2F5ED]">{theme.name}</span>
                <span className="mt-1 text-xs leading-relaxed text-[#A4ADA0]">{theme.desc}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

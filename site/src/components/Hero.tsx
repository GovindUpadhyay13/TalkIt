import { HeroDemo } from "./HeroDemo";
import { VERSION } from "../lib/site";
import { REPO, downloadUrl, useDetectedDownload, useDownloadHotkey } from "../lib/download";

export function Hero() {
  const detected = useDetectedDownload();
  const primaryHref = downloadUrl(detected.os);
  useDownloadHotkey(primaryHref);

  return (
    // overflow-x-clip here is a second line of defence: even if the demo stage
    // bleeds past its column on small screens it can never cause page scroll.
    <section className="mx-auto w-full max-w-6xl overflow-x-clip px-5 pt-14 pb-16 sm:px-8 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
        {/* min-w-0 lets this column shrink instead of being forced wide. */}
        <div className="min-w-0">
          <a
            href={`${REPO}/releases/latest`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A4ADA0] transition hover:text-[#C5F467]"
          >
            <span>See what's new in {VERSION}</span>
            <span aria-hidden="true">→</span>
          </a>
          <h1 className="wordmark mt-5 text-6xl sm:text-7xl tracking-tight leading-none">
            <span className="text-[#F2F5ED]">TALK</span><span className="text-[#C5F467]">IT</span>
          </h1>
          <p className="mt-5 text-xl font-bold sm:text-2xl text-[#F2F5ED]">A Windows-first, Gemma-powered voice desktop copilot.</p>
          <p className="mt-4 max-w-xl text-[#A4ADA0] leading-relaxed">
            Speak to write. Talk to act. Approve without interrupting your flow — powered by Google Gemma (local via Ollama or Cloud via Gemini API).
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <a
              href={primaryHref}
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#C5F467] px-6 py-3.5 font-bold text-[#111411] transition hover:bg-[#C5F467]/90 hover:shadow-[0_0_20px_rgba(197,244,103,0.35)]"
            >
              <span>{detected.label}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
              </svg>
            </a>
            <a
              href={REPO}
              className="inline-flex items-center gap-2 rounded-lg border border-[#343D34] bg-[#222922] px-5 py-3.5 text-sm font-medium text-[#F2F5ED] transition hover:bg-[#2b342b] hover:border-[#C5F467]/40"
            >
              View on GitHub <span aria-hidden="true">→</span>
            </a>
            {detected.note && <span className="text-xs text-[#A4ADA0]">{detected.note}</span>}
          </div>
        </div>

        {/* Animated live-demo. min-w-0 is essential: the demo authors on a fixed
            pixel surface, and without it that surface sets a min-content width
            that blows the grid (and the page) wider than the viewport. */}
        <div className="relative w-full min-w-0">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

import { REPO } from "../lib/download";

const NAV_LINKS = [
  { href: "#features", label: "Features", external: false },
  { href: "#themes", label: "Themes", external: false },
  { href: `${REPO}#readme`, label: "Docs", external: true },
  { href: `${REPO}/releases`, label: "Changelog", external: true },
];

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 border-b border-[#343D34]/40">
      <a href="#top" className="flex items-center gap-3 group">
        <img src="./icon.png" alt="TalkIt" className="h-8 w-8 rounded-lg shadow-[0_0_12px_rgba(197,244,103,0.25)] transition group-hover:shadow-[0_0_16px_rgba(197,244,103,0.4)]" />
        <span className="wordmark text-xl font-bold tracking-tight">
          <span className="text-[#F2F5ED]">Talk</span><span className="text-[#C5F467]">It</span>
        </span>
      </a>
      <nav className="flex items-center gap-6 text-sm text-[#A4ADA0]">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="hidden transition hover:text-[#F2F5ED] sm:inline"
          >
            {link.label}
          </a>
        ))}
        <a href={REPO} className="transition hover:text-[#F2F5ED]">
          GitHub
        </a>
        <a
          href="#download"
          className="inline-flex items-center gap-2 rounded-md bg-[#C5F467] px-4 py-2 text-sm font-semibold text-[#111411] transition hover:bg-[#C5F467]/90 hover:shadow-[0_0_14px_rgba(197,244,103,0.35)]"
        >
          Download
          <kbd className="rounded bg-[#111411]/15 px-1.5 py-0.5 text-[10px] font-mono leading-none text-[#111411]/80">
            D
          </kbd>
        </a>
      </nav>
    </header>
  );
}

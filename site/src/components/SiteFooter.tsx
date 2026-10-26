import { REPO } from "../lib/download";

const COLUMNS = [
  {
    heading: "[Project]",
    links: [
      { href: REPO, label: "GitHub" },
      { href: `${REPO}/releases`, label: "Releases" },
      { href: `${REPO}#roadmap`, label: "Roadmap" },
    ],
  },
  {
    heading: "[Resources]",
    links: [
      { href: `${REPO}#readme`, label: "Docs" },
      { href: `${REPO}/releases`, label: "Changelog" },
      { href: `${REPO}/blob/main/PRIVACY.md`, label: "Privacy" },
    ],
  },
  {
    heading: "[Connect]",
    links: [
      { href: `${REPO}/issues`, label: "Issues" },
      { href: `${REPO}/discussions`, label: "Discussions" },
    ],
  },
  {
    heading: "[Get it]",
    links: [{ href: "#download", label: "Download" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#343D34] bg-[#111411]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-5 py-16 sm:grid-cols-4 sm:px-8">
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <div className="font-mono text-xs uppercase tracking-wider text-[#8AA89A]">{col.heading}</div>
            <ul className="mt-4 space-y-3 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[#A4ADA0] transition hover:text-[#C5F467]">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pb-12 font-mono text-xs text-[#8AA89A] sm:px-8">
        <span>© 2026 TalkIt · open source</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C5F467]" />
          <span>Obsidian Lime Theme</span>
        </span>
      </div>
    </footer>
  );
}

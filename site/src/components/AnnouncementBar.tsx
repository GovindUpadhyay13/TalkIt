import { REPO } from "../lib/download";
import { VERSION } from "../lib/site";

export function AnnouncementBar() {
  return (
    <a
      href={`${REPO}/releases/latest`}
      className="block border-b border-[#343D34] bg-[#181f18] px-4 py-2 text-center text-xs text-[#F2F5ED]/90 transition hover:bg-[#222922] hover:text-[#C5F467] sm:text-sm font-medium"
    >
      TalkIt <span className="text-[#C5F467]">v{VERSION}</span> — a Windows-first,
      Gemma-powered voice desktop copilot <span aria-hidden="true">→</span>
    </a>
  );
}

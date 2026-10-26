import { useEffect } from "react";
import { AlertCircle, ShieldAlert, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PermissionRequestPayload } from "../../../main/ipc/channels";
import type { PermissionDecision } from "../../../main/agent/permissions";

// The sensitive-tool confirmation. Styled in Obsidian Lime:
// elevated charcoal surface (#222922), subtle borders (#343D34),
// amber caution badge for pending approval, and lime (#C5F467) primary action.
export function PermissionPrompt({
  request,
  onRespond,
}: {
  request: PermissionRequestPayload;
  onRespond: (decision: PermissionDecision) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRespond("deny");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRespond]);

  const isExternalAgent = request.skillId.startsWith("agent:");

  return (
    <div className="flex h-screen w-screen flex-col gap-4 overflow-hidden rounded-2xl border border-[#343D34] bg-[#222922] p-6 text-[#F2F5ED] shadow-2xl">
      {/* Header with status badge */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
            <AlertCircle className="size-3.5" />
            <span>Pending Authorization</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#A4ADA0]">
            {isExternalAgent ? "Coding Agent" : "System Skill"}
          </span>
        </div>

        <div className="text-lg font-semibold leading-snug tracking-tight text-[#F2F5ED]">
          {request.label}
        </div>
      </div>

      {/* Detail card */}
      <div className="rounded-lg border border-[#343D34] bg-[#181f18] px-3.5 py-2.5 font-mono text-xs leading-relaxed text-[#F2F5ED]/90 break-words">
        {request.detail}
      </div>

      {/* Voice prompt guide */}
      <div className="flex flex-col gap-1 rounded-lg border border-[#343D34]/70 bg-[#181f18]/60 p-2.5 text-xs text-[#A4ADA0]">
        <div className="flex items-center gap-1.5 font-medium text-[#F2F5ED]/80">
          <Volume2 className="size-3.5 text-[#C5F467]" />
          <span>TalkIt Voice Decisions:</span>
        </div>
        <p className="text-[11px] text-[#A4ADA0] pl-5">
          Say <strong className="text-[#C5F467]">“Allow once”</strong>, <strong className="text-[#C5F467]">“Always allow”</strong>, <strong className="text-[#f43f5e]">“Deny”</strong>, or <strong className="text-[#8AA89A]">“Explain again”</strong>
        </p>
      </div>

      {/* Action buttons */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
        <Button
          onClick={() => onRespond("allow_once")}
          className="bg-[#C5F467] text-[#111411] font-semibold hover:bg-[#C5F467]/90 hover:shadow-[0_0_12px_rgba(197,244,103,0.3)]"
        >
          Allow once
        </Button>
        <Button
          variant="outline"
          onClick={() => onRespond("always")}
          className="border-[#343D34] bg-[#222922] text-[#F2F5ED] hover:border-[#C5F467]/50 hover:bg-[#2b342b]"
        >
          Always allow
        </Button>
        <Button
          variant="outline"
          onClick={() => onRespond("deny")}
          className="border-[#343D34] bg-[#181f18] text-[#A4ADA0] hover:bg-[#222922] hover:text-[#F2F5ED]"
        >
          Deny (Esc)
        </Button>
        <Button
          variant="destructive"
          onClick={() => onRespond("never")}
          className="border border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e] hover:bg-[#f43f5e]/20"
        >
          Never allow
        </Button>
      </div>
    </div>
  );
}

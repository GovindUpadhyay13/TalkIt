import { useState } from "react";
import { LogOut, X } from "lucide-react";
import { useConfig } from "@/lib/use-config";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS } from "./sections";
import { TalkItBrand } from "@/components/brand/talkit-logo";

// The settings experience for the dedicated settings window: a sidebar of
// sections on the left, the active section's controls on the right. Config is
// loaded + mutated through the same IPC as the main window, and the main process
// broadcasts changes so both windows stay in sync live.
export function SettingsApp() {
  const { data, loading, setConfig, setSecret, resetConfig } = useConfig();
  const [active, setActive] = useState(SETTINGS_SECTIONS[0].id);

  if (loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-muted-foreground">
        <div className="font-mono text-xs uppercase tracking-[0.4em]">Settings</div>
      </div>
    );
  }

  // Sections can hide themselves for the current config (e.g. Voice (TTS) when
  // realtime voice mode is on). If the active one just hid — the user flipped
  // the mode live — fall back to the first visible section.
  const visibleSections = SETTINGS_SECTIONS.filter((s) => !s.hidden?.(data));
  const section =
    visibleSections.find((s) => s.id === active) ?? visibleSections[0];
  const Active = section.Component;

  return (
    <div className="flex flex-1 overflow-hidden bg-background text-foreground">
      {/* Sidebar with Obsidian Lime styling */}
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-[#181f18] p-3">
        <div className="flex items-center justify-between px-2 py-3 mb-1 border-b border-border/40">
          <TalkItBrand symbolSize={20} textSize="sm" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Settings</span>
        </div>
        {visibleSections.map((s) => {
          const selected = s.id === section.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150",
                selected
                  ? "bg-primary/10 text-primary border border-primary/30 font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border border-transparent",
              )}
            >
              <s.Icon className={cn("size-4 shrink-0 transition-colors", selected ? "text-primary" : "text-muted-foreground")} />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
        <div className="mt-auto pt-3 border-t border-border/40 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground transition cursor-pointer"
          >
            <X className="size-3.5 shrink-0" />
            <span>Close Settings</span>
          </button>
          <button
            type="button"
            onClick={() => window.opendex.quitApp()}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer"
          >
            <LogOut className="size-3.5 shrink-0" />
            <span>Quit TalkIt</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-8 py-8">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <section.Icon className="size-5 text-muted-foreground" />
              {section.label}
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <Active
              data={data}
              setConfig={setConfig}
              setSecret={setSecret}
              resetConfig={resetConfig}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

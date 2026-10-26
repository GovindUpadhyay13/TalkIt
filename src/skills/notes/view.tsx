import { TOOLS } from "./meta";
import { registerToolView } from "../tool-registry";
import type { ToolViewProps } from "../tool-view";

interface NoteResult {
  ok?: boolean;
  title?: string;
  filename?: string;
  path?: string;
  content?: string;
  notes?: string[];
  count?: number;
  error?: string;
}

function NoteCard({ result, status, surface }: ToolViewProps) {
  const data = result as NoteResult | null;
  if (!data || status !== "done" || data.error) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
        {data?.error ?? "Saving note…"}
      </div>
    );
  }

  const title = data.title || data.filename || "Note saved";

  if (surface === "notch" || surface === "overlay") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-foreground">
        <span className="text-sm font-medium truncate">📝 {title}</span>
        <span className="text-xs text-muted-foreground">Saved</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>📝</span>
        <span className="truncate">{title}</span>
      </div>
      {data.content && (
        <div className="mt-2 max-h-32 overflow-y-auto rounded bg-muted/60 p-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
          {data.content}
        </div>
      )}
      {data.path && (
        <div className="mt-2 truncate text-[10px] text-muted-foreground/70 font-mono">
          {data.path}
        </div>
      )}
    </div>
  );
}

registerToolView({
  name: TOOLS.createNote,
  label: (input) => ({
    icon: "📝",
    label: `Create note "${(input as { title?: string })?.title || "Note"}"`,
  }),
  Card: NoteCard,
});

registerToolView({
  name: TOOLS.appendNote,
  label: (input) => ({
    icon: "📝",
    label: `Append to "${(input as { titleOrFilename?: string })?.titleOrFilename || "Note"}"`,
  }),
  Card: NoteCard,
});

registerToolView({
  name: TOOLS.readNote,
  label: (input) => ({
    icon: "📖",
    label: `Read note "${(input as { titleOrFilename?: string })?.titleOrFilename || "Note"}"`,
  }),
  Card: NoteCard,
});

registerToolView({
  name: TOOLS.listNotes,
  label: () => ({ icon: "📂", label: "List notes" }),
  Card: NoteCard,
});

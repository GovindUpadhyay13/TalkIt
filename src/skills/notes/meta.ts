import type { SkillMeta } from "../types";

export const TOOLS = {
  createNote: "createNote",
  appendNote: "appendNote",
  readNote: "readNote",
  listNotes: "listNotes",
} as const;

export const meta: SkillMeta = {
  id: "notes",
  label: "Notes",
  description: "Create, read, and manage local desktop notes and research summaries.",
  sensitive: false,
};

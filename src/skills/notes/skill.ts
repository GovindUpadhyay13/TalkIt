import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { app } from "electron";
import { z } from "zod";
import { meta, TOOLS } from "./meta";
import type { Skill } from "../types";

function getNotesDir(): string {
  try {
    const docs = app ? app.getPath("documents") : process.cwd();
    return join(docs, "Talkit", "Notes");
  } catch {
    return join(process.cwd(), "notes");
  }
}

async function ensureNotesDir(): Promise<string> {
  const dir = getNotesDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function sanitizeFilename(title: string): string {
  const safe = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/^[-_.]+/, "")
    .slice(0, 80);
  return (safe || "untitled_note") + ".md";
}

function safeResolve(dir: string, filename: string): string | null {
  const target = resolve(dir, filename);
  if (!target.startsWith(resolve(dir))) {
    return null;
  }
  return target;
}

export const notesSkill: Skill = {
  ...meta,
  tools: [
    {
      name: TOOLS.createNote,
      description: "Create a local note file with a title and content (e.g., research papers, findings, summaries).",
      inputSchema: z.object({
        title: z.string().describe("Title or topic for the note."),
        content: z.string().describe("Content of the note in markdown or plain text."),
      }),
      summarize: (i) => `Create note: "${(i as { title: string }).title}"`,
      execute: async ({ title, content }: { title: string; content: string }) => {
        try {
          const dir = await ensureNotesDir();
          const filename = sanitizeFilename(title);
          const filepath = safeResolve(dir, filename);
          if (!filepath) return { error: "Invalid note title or path." };

          const timestamp = new Date().toISOString();
          const body = `# ${title}\n*Created on: ${timestamp}*\n\n${content}\n`;
          await fs.writeFile(filepath, body, "utf8");
          return { ok: true, title, filename, path: filepath };
        } catch (err) {
          return { error: `Failed to create note: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: TOOLS.appendNote,
      description: "Append new content or bullet points to an existing note.",
      inputSchema: z.object({
        titleOrFilename: z.string().describe("The note title or filename to append to."),
        additionalContent: z.string().describe("The new text or markdown to append."),
      }),
      summarize: (i) => `Append to note: "${(i as { titleOrFilename: string }).titleOrFilename}"`,
      execute: async ({
        titleOrFilename,
        additionalContent,
      }: {
        titleOrFilename: string;
        additionalContent: string;
      }) => {
        try {
          const dir = await ensureNotesDir();
          const filename = titleOrFilename.endsWith(".md")
            ? titleOrFilename
            : sanitizeFilename(titleOrFilename);
          const filepath = safeResolve(dir, filename);
          if (!filepath) return { error: "Invalid note path." };

          const toAppend = `\n---\n*Updated on: ${new Date().toISOString()}*\n\n${additionalContent}\n`;
          await fs.appendFile(filepath, toAppend, "utf8");
          return { ok: true, filename, path: filepath };
        } catch (err) {
          return { error: `Failed to append to note: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: TOOLS.readNote,
      description: "Read the content of a saved note by title or filename.",
      inputSchema: z.object({
        titleOrFilename: z.string().describe("Title or filename of the note to read."),
      }),
      summarize: (i) => `Read note: "${(i as { titleOrFilename: string }).titleOrFilename}"`,
      execute: async ({ titleOrFilename }: { titleOrFilename: string }) => {
        try {
          const dir = await ensureNotesDir();
          const filename = titleOrFilename.endsWith(".md")
            ? titleOrFilename
            : sanitizeFilename(titleOrFilename);
          const filepath = safeResolve(dir, filename);
          if (!filepath) return { error: "Invalid note path." };

          const content = await fs.readFile(filepath, "utf8");
          return { ok: true, filename, content };
        } catch (err) {
          return { error: `Could not read note: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: TOOLS.listNotes,
      description: "List all existing notes in the Talkit notes directory.",
      inputSchema: z.object({}),
      summarize: () => "List notes",
      execute: async () => {
        try {
          const dir = await ensureNotesDir();
          const files = await fs.readdir(dir);
          const noteFiles = files.filter((f) => f.endsWith(".md"));
          return { ok: true, count: noteFiles.length, notes: noteFiles, directory: dir };
        } catch (err) {
          return { error: `Could not list notes: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
  ],
};

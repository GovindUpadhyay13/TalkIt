import { clipboard } from "electron";
import { Key, keyboard } from "@nut-tree-fork/nut-js";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface DictationState {
  isDictating: boolean;
  isPaused: boolean;
  lastInsertedText: string;
  history: string[];
}

const state: DictationState = {
  isDictating: false,
  isPaused: false,
  lastInsertedText: "",
  history: [],
};

/**
 * Inserts recognized text into the currently focused desktop text field on Windows/macOS.
 * Preserves the user's existing clipboard contents and deduplicates accidental retries.
 */
export async function insertDictatedText(text: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: true };
  }

  // Prevent exact duplicate re-insertion within a rapid window
  if (state.lastInsertedText === trimmed && state.history.length > 0) {
    return { ok: true };
  }

  try {
    const prevClipboard = clipboard.readText();
    // Add trailing space if appropriate for natural typing
    const textToInsert = trimmed.endsWith(" ") ? trimmed : `${trimmed} `;
    clipboard.writeText(textToInsert);

    const modKey = process.platform === "darwin" ? Key.LeftCmd : Key.LeftControl;
    await keyboard.pressKey(modKey, Key.V);
    await keyboard.releaseKey(Key.V, modKey);

    // Give the target app a beat to receive the paste event
    await delay(120);

    // Restore previous clipboard
    clipboard.writeText(prevClipboard);

    state.lastInsertedText = trimmed;
    state.history.push(trimmed);
    if (state.history.length > 50) state.history.shift();

    return { ok: true };
  } catch (err) {
    console.error("[talkit dictation] failed to paste text:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getDictationState(): DictationState {
  return { ...state };
}

export function setDictationActive(active: boolean): void {
  state.isDictating = active;
  if (!active) {
    state.isPaused = false;
  }
}

export function setDictationPaused(paused: boolean): void {
  state.isPaused = paused;
}

export function clearDictationHistory(): void {
  state.lastInsertedText = "";
  state.history = [];
}

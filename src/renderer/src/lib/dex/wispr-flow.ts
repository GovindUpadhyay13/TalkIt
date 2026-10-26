/**
 * Wispr Flow transcription parser for TalkIt.
 * Handles continuous transcription, "Whisper wait" pausing with preceding text extraction,
 * and "TalkIt continue" resume detection.
 */

const WAIT_PATTERN = /(?:^|\b)(?:whisper\s*wait|whisper,\s*wait|whisper\s*weight)\b/i;
const RESUME_PATTERN = /(?:^|\b)(?:talk\s*it\s+continue|talkit\s+continue|continue|resume)\b/i;
const WAKE_PATTERN = /\b(?:hey\s+)?(?:talk\s*it|talkit|target|take\s*it|hate\s+or\s+get)\b/i;

export interface WisprParseResult {
  type: "wait" | "transcription" | "empty";
  text?: string;
  textBefore?: string;
}

/**
 * Strips leading wake words ("hey talkit", "talkit") from transcribed utterances.
 */
export function stripWakeWord(text: string): string {
  return text.replace(/^(hey\s+)?talk\s*it[,.]?\s*/i, "").trim();
}

/**
 * Parses a transcribed audio chunk for Wispr Flow flow-control.
 */
export function parseWisprFlowChunk(rawText: string): WisprParseResult {
  const stripped = stripWakeWord(rawText.trim());
  if (!stripped || !/[a-z0-9]/i.test(stripped)) {
    return { type: "empty" };
  }

  const waitMatch = stripped.match(WAIT_PATTERN);
  if (waitMatch && waitMatch.index !== undefined) {
    const beforeWait = stripped.slice(0, waitMatch.index).trim().replace(/[,.:;!?]+$/, "").trim();
    return {
      type: "wait",
      textBefore: beforeWait && /[a-z0-9]/i.test(beforeWait) ? beforeWait : undefined,
    };
  }

  return {
    type: "transcription",
    text: stripped,
  };
}

/**
 * Checks if the utterance contains the resume command ("TalkIt continue").
 */
export function isWisprResumeCommand(text: string): boolean {
  return RESUME_PATTERN.test(text.trim());
}

/**
 * Checks if the utterance contains the hardcoded wake command ("Hey TalkIt").
 */
export function isWakeCommand(text: string): boolean {
  return WAKE_PATTERN.test(text.trim());
}

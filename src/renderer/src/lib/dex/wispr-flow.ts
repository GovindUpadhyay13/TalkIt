/**
 * Wispr Flow transcription parser for TalkIt.
 * Handles continuous transcription, "Whisper wait" pausing with preceding text extraction,
 * and "TalkIt continue" resume detection.
 */

const WAIT_PATTERN = /(?:^|\b)(?:whisper\s*wait|whisper,\s*wait|whisper\s*weight)\b/i;
const RESUME_PATTERN = /(?:^|\b)(?:talk\s*it\s+continue|talkit\s+continue|continue|resume)\b/i;
const WAKE_PATTERN = /\b(?:hey\s+)?talk\s*it\b/i;
const EXECUTION_MODE_PATTERN = /(?:^|\b)(?:execution\s+mode|execute\s+mode|agent\s+mode|command\s+mode)\b/i;
const TYPING_MODE_PATTERN = /(?:^|\b)(?:typing\s+mode|type\s+mode|dictation\s+mode|transcription\s+mode)\b/i;

export interface WisprParseResult {
  type: "wait" | "transcription" | "execute" | "switch_typing" | "empty";
  text?: string;
  textBefore?: string;
  task?: string;
}

/**
 * Strips leading wake words ("hey talkit", "talkit") from transcribed utterances.
 */
export function stripWakeWord(text: string): string {
  return text.replace(/^(hey\s+)?talk\s*it[,.]?\s*/i, "").trim();
}

/**
 * Checks if the utterance contains the execution mode command.
 */
export function isExecutionModeCommand(text: string): boolean {
  return EXECUTION_MODE_PATTERN.test(text.trim());
}

/**
 * Checks if the utterance contains the typing mode command.
 */
export function isTypingModeCommand(text: string): boolean {
  return TYPING_MODE_PATTERN.test(text.trim());
}

/**
 * Parses a transcribed audio chunk for Wispr Flow flow-control and mode switching.
 */
export function parseWisprFlowChunk(rawText: string): WisprParseResult {
  const stripped = stripWakeWord(rawText.trim());
  if (!stripped || !/[a-z0-9]/i.test(stripped)) {
    return { type: "empty" };
  }

  // Check for execution mode command (e.g. "execution mode open notepad", "execution mode")
  const execMatch = stripped.match(EXECUTION_MODE_PATTERN);
  if (execMatch && execMatch.index !== undefined) {
    const beforeExec = stripped.slice(0, execMatch.index).trim().replace(/[,.:;!?]+$/, "").trim();
    const afterExec = stripped.slice(execMatch.index + execMatch[0].length).trim().replace(/^[,.:;!?\s]+/, "").trim();
    return {
      type: "execute",
      task: afterExec,
      textBefore: beforeExec && /[a-z0-9]/i.test(beforeExec) ? beforeExec : undefined,
    };
  }

  // Check for explicit typing mode switch
  if (isTypingModeCommand(stripped)) {
    return { type: "switch_typing" };
  }

  // Direct desktop actions (e.g. "open calculator", "launch notepad", "open chrome") are recognized as execute
  const directActionMatch = stripped.match(/^(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9._ -]+)$/i);
  if (directActionMatch) {
    return {
      type: "execute",
      task: stripped,
    };
  }

  // Check for pause command ("Whisper wait")
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


export type DexStatus =
  | "idle" // very brief — before auto-engage fires
  | "listening_wake" // continuous recognition waiting for the wake word
  | "active_listening" // captured wake word, listening for command
  | "follow_up_listening" // listening for a follow-up turn after a reply
  | "writing" // Talkit Write: system-wide voice dictation
  | "paused" // dictation or active operation paused
  | "thinking" // querying the agent / planning with Gemma
  | "executing" // Talkit Execute: running tool or automation
  | "approval_pending" // Talkit Approve: waiting for permission decision
  | "confirming" // confirming an action or permission
  | "speaking" // audio playing
  | "muted" // wake-word loop paused
  | "error" // unrecoverable error
  | "unsupported"; // browser doesn't support SpeechRecognition

export interface TranscriptTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const STATUS_LABELS: Record<DexStatus, string> = {
  idle: "Initialising…",
  listening_wake: "Standing by…",
  active_listening: "Listening…",
  follow_up_listening: "Anything else?",
  writing: "Transcribing (Wispr Flow)…",
  paused: "Whisper Paused (Say 'TalkIt continue')",
  thinking: "Thinking…",
  executing: "Executing action…",
  approval_pending: "Approval required…",
  confirming: "Confirming…",
  speaking: "Speaking…",
  muted: "Muted",
  error: "Something went wrong",
  unsupported: "Voice not supported in this browser",
};

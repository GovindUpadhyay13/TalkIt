import type { CodingAgentDecision } from "./approval-types";

export type ParsedVoiceDecision =
  | { type: "decision"; decision: CodingAgentDecision }
  | { type: "explain" }
  | { type: "ambiguous"; rawText: string };

/**
 * Parses user voice responses when an approval prompt is active.
 * Enforces conservative interpretation: ambiguous speech never defaults to approval.
 */
export function parseVoiceDecision(transcript: string): ParsedVoiceDecision {
  const text = transcript.trim().toLowerCase().replace(/[.,!?;:]/g, "");

  // Explain again requests
  if (
    text.includes("explain that again") ||
    text.includes("explain again") ||
    text.includes("say that again") ||
    text.includes("repeat that") ||
    text.includes("what does it need")
  ) {
    return { type: "explain" };
  }

  // Explicit permanent decisions
  if (
    text === "always allow" ||
    text === "always approve" ||
    text === "always" ||
    text.includes("always allow this")
  ) {
    return { type: "decision", decision: "always" };
  }

  if (
    text === "never allow" ||
    text === "never" ||
    text === "block permanently" ||
    text.includes("never allow this")
  ) {
    return { type: "decision", decision: "never" };
  }

  // Standard decisions
  if (
    text === "allow once" ||
    text === "allow" ||
    text === "approve" ||
    text === "yes allow" ||
    text === "go ahead" ||
    text === "allow this" ||
    text === "ok allow"
  ) {
    return { type: "decision", decision: "allow_once" };
  }

  if (
    text === "deny" ||
    text === "reject" ||
    text === "do not allow" ||
    text === "dont allow" ||
    text === "disallow" ||
    text === "no"
  ) {
    return { type: "decision", decision: "deny" };
  }

  if (text === "cancel" || text === "stop" || text === "abort") {
    return { type: "decision", decision: "cancel" };
  }

  return { type: "ambiguous", rawText: transcript };
}

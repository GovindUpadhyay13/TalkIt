import type { SttProvider } from "../config/schema";
import { transcribeOpenAI } from "./openai";
import { transcribeGemini } from "./gemini";

// Provider switch for cloud transcription.
export async function transcribe(
  provider: SttProvider,
  wav: Buffer,
): Promise<string> {
  switch (provider) {
    case "gemini":
      return transcribeGemini(wav);
    case "openai":
      return transcribeOpenAI(wav);
    default:
      throw new Error(`Provider "${provider}" is not a cloud STT provider.`);
  }
}

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import type { OpenDexConfig } from "../../config/schema";

export interface OllamaAvailability {
  available: boolean;
  models: string[];
  hasConfiguredModel: boolean;
  reason?: string;
  baseUrl: string;
}

/** Result of probing whether the Apple on-device model can be used right now. */
export interface AppleAvailability {
  available: boolean;
  /** Human-readable reason when unavailable (OS too old, Intelligence off, …). */
  reason?: string;
}

/**
 * Probe local Ollama service to check if the daemon is running and whether
 * the configured Gemma model is pulled and ready.
 */
export async function probeOllama(
  baseUrl = "http://127.0.0.1:11434/v1",
  modelId = "gemma3:4b",
): Promise<OllamaAvailability> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const rootUrl = cleanBase.replace(/\/v1\/?$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${rootUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        available: false,
        models: [],
        hasConfiguredModel: false,
        baseUrl: cleanBase,
        reason: `Ollama returned HTTP ${res.status} at ${rootUrl}/api/tags`,
      };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
    const models = (data.models || []).map((m) => m.name || m.model || "").filter(Boolean);
    const hasConfiguredModel = models.some(
      (m) => m === modelId || m.startsWith(`${modelId}:`) || modelId.startsWith(`${m}:`),
    );

    return {
      available: true,
      models,
      hasConfiguredModel,
      baseUrl: cleanBase,
      reason: hasConfiguredModel
        ? undefined
        : `Ollama is running, but model "${modelId}" is not downloaded yet. Run: ollama run ${modelId}`,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      available: false,
      models: [],
      hasConfiguredModel: false,
      baseUrl: cleanBase,
      reason: `Could not connect to Ollama at ${cleanBase}. Start Ollama with 'ollama serve' and download the model with 'ollama run ${modelId}'.`,
    };
  }
}

/**
 * Maps the configured provider to a concrete AI SDK model. Returns either a
 * `LanguageModel` instance (gemma/ollama, direct providers, apple) or a bare
 * model-id string (the gateway path, resolved by the SDK's global Vercel AI Gateway provider).
 *
 * Throws a user-facing error for providers that can't run — the chat handler
 * surfaces the message as a spoken apology.
 */
export async function resolveModel(config: OpenDexConfig): Promise<LanguageModel> {
  const { provider, model } = config.llm;
  switch (provider) {
    case "gemma": {
      const baseUrl = config.llm.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
      const modelId = model || "gemma3:4b";
      const probe = await probeOllama(baseUrl, modelId);
      if (!probe.available) {
        throw new Error(probe.reason || `Ollama is not running at ${baseUrl}`);
      }
      if (!probe.hasConfiguredModel) {
        throw new Error(
          probe.reason || `Gemma model "${modelId}" is not available in Ollama. Run: ollama run ${modelId}`,
        );
      }
      return createOpenAI({
        baseURL: baseUrl,
        apiKey: "ollama",
      })(modelId);
    }
    case "gemini-gemma": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "No Gemini API key found. Please provide a GEMINI_API_KEY from Google AI Studio (https://aistudio.google.com/apikey).",
        );
      }
      const modelId = model || "gemini-2.5-flash";
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      return createGoogleGenerativeAI({ apiKey })(modelId) as unknown as LanguageModel;
    }
    case "openai":
      if (!process.env.OPENAI_API_KEY) throw new Error("no OpenAI API key is set");
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(model);
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("no Anthropic API key is set");
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(model);
    case "xai":
      if (!process.env.XAI_API_KEY) throw new Error("no xAI API key is set");
      return createXai({ apiKey: process.env.XAI_API_KEY })(model);
    case "apple": {
      // Native (Swift/Rust), macOS-only — dynamic-imported so non-darwin builds
      // never load the binary, and the chunk is only pulled when selected.
      const { appleAI, appleAISDK } = await import("@meridius-labs/apple-on-device-ai");
      const { available, reason } = await appleAISDK.checkAvailability();
      if (!available) throw new Error(reason || "Apple Intelligence is unavailable");
      return appleAI("apple-on-device");
    }
    case "opendex":
      throw new Error("the OpenDex subscription isn't available yet");
    case "gateway":
    default:
      // A bare model id routes through the SDK's global AI Gateway provider,
      // which reads AI_GATEWAY_API_KEY from the environment.
      return model;
  }
}

/** Probe Apple on-device availability for the UI (provider picker gate). Never
 *  throws — a missing binary / unsupported platform resolves to unavailable. */
export async function checkAppleAvailability(): Promise<AppleAvailability> {
  if (process.platform !== "darwin") {
    return { available: false, reason: "Requires macOS on Apple Silicon" };
  }
  try {
    const { appleAISDK } = await import("@meridius-labs/apple-on-device-ai");
    return await appleAISDK.checkAvailability();
  } catch (err) {
    return {
      available: false,
      reason: err instanceof Error ? err.message : "Apple Intelligence is unavailable",
    };
  }
}

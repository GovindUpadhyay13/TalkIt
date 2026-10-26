// Metadata describing the LLM providers OpenDex can route chat through. This
// file is intentionally dependency-free (no electron/node/ai imports) so it can
// be imported as a *value* from both the main process (the model resolver in
// agent/llm/resolve-model.ts) and the renderer (the provider picker UI). The
// resolver maps each provider id to a concrete AI SDK model instance.

import type { LlmProvider, ProviderAuth, SecretName } from "./schema";

export interface ModelOption {
  /** Model id passed to the provider (or the gateway slash-form). */
  id: string;
  label: string;
}

export interface LlmProviderMeta {
  id: LlmProvider;
  label: string;
  /** One-line description shown in the picker. */
  blurb: string;
  /** local = on-device/free · byok = bring your own key · managed = hosted by us. */
  kind: "local" | "byok" | "managed";
  auth: ProviderAuth;
  /** The secret it needs, when `auth === "key"`. */
  secretName?: SecretName;
  /** Curated model ids. Empty for fixed/local (apple) or unimplemented (opendex).
   *  Direct/gateway providers also allow a free-text custom id in the UI. */
  models: ModelOption[];
  /** Whether the provider's models can drive tools (skills + computer-use). */
  supportsTools: boolean;
  /** Where to get a key (deep link), shown beside the key field. */
  keyUrl?: string;
  /** Platforms the provider runs on. Omitted = all. */
  platforms?: NodeJS.Platform[];
  /** Reserved but not yet implemented — renders disabled in the picker. */
  comingSoon?: boolean;
  /** Optional caveat surfaced under the provider (e.g. on-device tool limits). */
  note?: string;
}

export const LLM_PROVIDERS: LlmProviderMeta[] = [
  {
    id: "gemma",
    label: "Google Gemma (Run Locally / Ollama)",
    blurb: "Google's open Gemma model family running locally on your PC via Ollama.",
    kind: "local",
    auth: "none",
    supportsTools: true,
    models: [
      { id: "gemma3:4b", label: "Gemma 3 (4B) — Recommended" },
      { id: "gemma3:1b", label: "Gemma 3 (1B) — Fast / Low Resource" },
      { id: "gemma3:12b", label: "Gemma 3 (12B) — High Accuracy" },
      { id: "gemma2:9b", label: "Gemma 2 (9B)" },
      { id: "gemma2:2b", label: "Gemma 2 (2B)" },
    ],
    note: "Served locally through the Ollama runtime (default: http://127.0.0.1:11434). Completely private with zero cloud fees.",
  },
  {
    id: "gemini-gemma",
    label: "Google Gemma (Gemini API / Cloud)",
    blurb: "Google's hosted Gemma models accessed via the Gemini API.",
    kind: "byok",
    auth: "key",
    secretName: "GEMINI_API_KEY",
    keyUrl: "https://aistudio.google.com/apikey",
    supportsTools: true,
    models: [
      { id: "gemma-4-26b-a4b-it", label: "Gemma 4 (26B-A4B-IT) — Multimodal & Thinking" },
      { id: "gemma-4-31b-it", label: "Gemma 4 (31B-IT) — High Capacity Reasoning" },
      { id: "gemma-2-27b-it", label: "Gemma 2 (27B-IT)" },
      { id: "gemma-2-9b-it", label: "Gemma 2 (9B-IT)" },
    ],
    note: "Hosted on Google Cloud via the Gemini API. Requires an API key from Google AI Studio.",
  },
  {
    id: "apple",
    label: "Apple Intelligence",
    blurb: "Runs on your Mac, free and fully private.",
    kind: "local",
    auth: "none",
    models: [{ id: "apple-on-device", label: "Apple on-device model" }],
    supportsTools: true,
    platforms: ["darwin"],
    note: "Runs entirely on your Mac. The on-device model is small — for heavy computer-use, a cloud provider is more reliable.",
  },
  {
    id: "openai",
    label: "OpenAI",
    blurb: "Use your own OpenAI API key.",
    kind: "byok",
    auth: "key",
    secretName: "OPENAI_API_KEY",
    keyUrl: "https://platform.openai.com/api-keys",
    supportsTools: true,
    models: [
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    blurb: "Use your own Anthropic API key.",
    kind: "byok",
    auth: "key",
    secretName: "ANTHROPIC_API_KEY",
    keyUrl: "https://console.anthropic.com/settings/keys",
    supportsTools: true,
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    blurb: "Use your own xAI API key.",
    kind: "byok",
    auth: "key",
    secretName: "XAI_API_KEY",
    keyUrl: "https://console.x.ai/team/default/api-keys",
    supportsTools: true,
    models: [
      { id: "grok-4.20-reasoning", label: "Grok 4.20 (reasoning)" },
      { id: "grok-4.20-non-reasoning", label: "Grok 4.20 (fast)" },
      { id: "grok-4.3", label: "Grok 4.3" },
      { id: "grok-3-mini", label: "Grok 3 mini" },
    ],
  },
  {
    id: "gateway",
    label: "Vercel AI Gateway",
    blurb: "Advanced — one key, any provider. Use a provider/model id.",
    kind: "byok",
    auth: "key",
    secretName: "AI_GATEWAY_API_KEY",
    keyUrl: "https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fai%2Fapi-keys&title=AI+Gateway+API+Key",
    supportsTools: true,
    models: [
      { id: "anthropic/claude-sonnet-4-6", label: "anthropic/claude-sonnet-4-6" },
      { id: "openai/gpt-5", label: "openai/gpt-5" },
      { id: "xai/grok-4.20-reasoning", label: "xai/grok-4.20-reasoning" },
      { id: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro" },
    ],
  },
];

export function getProviderMeta(id: LlmProvider): LlmProviderMeta | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

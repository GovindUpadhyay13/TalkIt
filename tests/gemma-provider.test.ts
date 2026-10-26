import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/main/config/schema";
import { getProviderMeta, LLM_PROVIDERS } from "../src/main/config/llm-providers";
import { probeOllama, resolveModel } from "../src/main/agent/llm/resolve-model";

describe("Google Gemma & Gemini LLM Provider", () => {
  it("has Google Gemini configured as the primary default provider in DEFAULT_CONFIG", () => {
    assert.equal(DEFAULT_CONFIG.llm.provider, "gemini-gemma");
    assert.equal(DEFAULT_CONFIG.llm.model, "gemini-2.5-flash");
  });

  it("lists Google Gemini as the first provider in LLM_PROVIDERS with curated models", () => {
    const first = LLM_PROVIDERS[0];
    assert.equal(first.id, "gemini-gemma");
    assert.equal(first.kind, "byok");
    assert.equal(first.auth, "key");
    assert.equal(first.secretName, "GEMINI_API_KEY");
    assert.ok(first.models.some((m) => m.id === "gemini-2.5-flash"));
  });

  it("getProviderMeta returns metadata for gemma", () => {
    const meta = getProviderMeta("gemma");
    assert.ok(meta);
    assert.equal(meta.label, "Google Gemma (Run Locally / Ollama)");
    assert.equal(meta.supportsTools, true);
  });

  it("lists gemini-gemma as second provider with Gemini API key auth and Gemma 4 models", () => {
    const meta = getProviderMeta("gemini-gemma");
    assert.ok(meta);
    assert.equal(meta.kind, "byok");
    assert.equal(meta.auth, "key");
    assert.equal(meta.secretName, "GEMINI_API_KEY");
    assert.equal(meta.keyUrl, "https://aistudio.google.com/apikey");
    assert.ok(meta.models.some((m) => m.id === "gemma-4-26b-a4b-it"));
    assert.ok(meta.models.some((m) => m.id === "gemma-4-31b-it"));
  });

  it("resolveModel throws informative error when GEMINI_API_KEY is not set", async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const geminiConfig = {
        ...DEFAULT_CONFIG,
        llm: {
          provider: "gemini-gemma" as const,
          model: "gemma-4-26b-a4b-it",
        },
      };

      await assert.rejects(
        async () => {
          await resolveModel(geminiConfig);
        },
        (err: Error) => {
          assert.ok(err.message.includes("GEMINI_API_KEY") || err.message.includes("Google AI Studio"));
          return true;
        },
      );
    } finally {
      if (origKey !== undefined) {
        process.env.GEMINI_API_KEY = origKey;
      }
    }
  });

  it("probeOllama returns unavailable when endpoint is unreachable without hanging", async () => {
    // Port 65530 is an invalid/closed port
    const result = await probeOllama("http://127.0.0.1:65530/v1", "gemma3:4b");
    assert.equal(result.available, false);
    assert.equal(result.hasConfiguredModel, false);
    assert.ok(result.reason?.includes("Could not connect to Ollama"));
  });

  it("resolveModel throws informative error with setup instructions when Ollama is offline", async () => {
    const badConfig = {
      ...DEFAULT_CONFIG,
      llm: {
        provider: "gemma" as const,
        model: "gemma3:4b",
        ollamaBaseUrl: "http://127.0.0.1:65530/v1",
      },
    };

    await assert.rejects(
      async () => {
        await resolveModel(badConfig);
      },
      (err: Error) => {
        assert.ok(err.message.includes("Ollama") || err.message.includes("Could not connect"));
        return true;
      },
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/main/config/schema";

describe("Obsidian Lime Theme System", () => {
  it("has obsidian-lime as the default appearance theme in DEFAULT_CONFIG", () => {
    assert.equal(DEFAULT_CONFIG.appearance.theme, "obsidian-lime");
  });

  it("has TalkIt configured as the assistant name", () => {
    assert.equal(DEFAULT_CONFIG.assistant.name, "TalkIt");
  });
});

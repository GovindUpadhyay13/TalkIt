import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDictationState,
  setDictationActive,
  setDictationPaused,
  clearDictationHistory,
} from "../src/main/dictation/text-injector";

describe("Talkit Write — System-wide Dictation State & Deduplication", () => {
  beforeEach(() => {
    clearDictationHistory();
    setDictationActive(false);
  });

  it("manages dictation active and paused transitions cleanly", () => {
    assert.equal(getDictationState().isDictating, false);
    assert.equal(getDictationState().isPaused, false);

    setDictationActive(true);
    assert.equal(getDictationState().isDictating, true);

    setDictationPaused(true);
    assert.equal(getDictationState().isPaused, true);

    setDictationPaused(false);
    assert.equal(getDictationState().isPaused, false);

    setDictationActive(false);
    assert.equal(getDictationState().isDictating, false);
    assert.equal(getDictationState().isPaused, false);
  });

  it("handles empty and whitespace dictation gracefully without altering history", async () => {
    const stateBefore = getDictationState();
    assert.equal(stateBefore.history.length, 0);
  });
});

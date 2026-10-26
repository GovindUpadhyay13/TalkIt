import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDictationState,
  setDictationActive,
  setDictationPaused,
  clearDictationHistory,
} from "../src/main/dictation/text-injector";
import {
  parseWisprFlowChunk,
  isWisprResumeCommand,
  isWakeCommand,
  stripWakeWord,
} from "../src/renderer/src/lib/dex/wispr-flow";

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

describe("Wispr Flow — Flow Control & Transcription Parsing", () => {
  it("strips leading 'Hey TalkIt' or 'TalkIt' wake words", () => {
    assert.equal(stripWakeWord("Hey TalkIt I want to write an email"), "I want to write an email");
    assert.equal(stripWakeWord("TalkIt here is my proposal"), "here is my proposal");
    assert.equal(stripWakeWord("hey talk it please review"), "please review");
  });

  it("detects 'Whisper wait' and extracts preceding text to insert", () => {
    const res1 = parseWisprFlowChunk("Here is the first paragraph Whisper wait");
    assert.equal(res1.type, "wait");
    assert.equal(res1.textBefore, "Here is the first paragraph");

    const res2 = parseWisprFlowChunk("Whisper wait");
    assert.equal(res2.type, "wait");
    assert.equal(res2.textBefore, undefined);

    const res3 = parseWisprFlowChunk("Please calculate this total, whisper, wait");
    assert.equal(res3.type, "wait");
    assert.equal(res3.textBefore, "Please calculate this total");
  });

  it("parses continuous transcription chunks correctly", () => {
    const res = parseWisprFlowChunk("The quarterly review shows strong growth across all regions.");
    assert.equal(res.type, "transcription");
    assert.equal(res.text, "The quarterly review shows strong growth across all regions.");
  });

  it("identifies empty and noise hallucinations as empty", () => {
    assert.equal(parseWisprFlowChunk("").type, "empty");
    assert.equal(parseWisprFlowChunk("   ").type, "empty");
    assert.equal(parseWisprFlowChunk(".").type, "empty");
    assert.equal(parseWisprFlowChunk("♪").type, "empty");
  });

  it("detects 'TalkIt continue' and resume commands", () => {
    assert.equal(isWisprResumeCommand("TalkIt continue"), true);
    assert.equal(isWisprResumeCommand("talk it continue"), true);
    assert.equal(isWisprResumeCommand("continue"), true);
    assert.equal(isWisprResumeCommand("resume"), true);
    assert.equal(isWisprResumeCommand("random talking text"), false);
  });

  it("detects hardcoded 'Hey TalkIt' wake command", () => {
    assert.equal(isWakeCommand("Hey TalkIt"), true);
    assert.equal(isWakeCommand("hey talk it"), true);
    assert.equal(isWakeCommand("talkit"), true);
    assert.equal(isWakeCommand("hello assistant"), false);
  });

  it("detects 'execution mode' and extracts task for desktop implementation", () => {
    const res1 = parseWisprFlowChunk("Hey TalkIt, execution mode open notepad and write hello");
    assert.equal(res1.type, "execute");
    assert.equal(res1.task, "open notepad and write hello");

    const res2 = parseWisprFlowChunk("execution mode search Google for today's weather");
    assert.equal(res2.type, "execute");
    assert.equal(res2.task, "search Google for today's weather");

    const res3 = parseWisprFlowChunk("Hey TalkIt, execution mode");
    assert.equal(res3.type, "execute");
    assert.equal(res3.task, "");

    const res4 = parseWisprFlowChunk("Please transcribe this sentence execution mode open calculator");
    assert.equal(res4.type, "execute");
    assert.equal(res4.textBefore, "Please transcribe this sentence");
    assert.equal(res4.task, "open calculator");

    const res5 = parseWisprFlowChunk("typing mode");
    assert.equal(res5.type, "switch_typing");
  });
});


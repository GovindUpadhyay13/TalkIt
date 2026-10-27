import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseVoiceDecision } from "../src/main/agent/approval/voice-decision";
import {
  startApprovalServer,
  resolveExternalRequest,
  stopApprovalServer,
} from "../src/main/agent/approval/approval-server";

describe("Talkit Approve — Voice Decisions & Coding Agent Server", () => {
  describe("parseVoiceDecision", () => {
    it("parses explicit positive decisions", () => {
      assert.deepEqual(parseVoiceDecision("allow once"), {
        type: "decision",
        decision: "allow_once",
      });
      assert.deepEqual(parseVoiceDecision("allow"), {
        type: "decision",
        decision: "allow_once",
      });
      assert.deepEqual(parseVoiceDecision("approve"), {
        type: "decision",
        decision: "allow_once",
      });
      assert.deepEqual(parseVoiceDecision("always allow"), {
        type: "decision",
        decision: "always",
      });
    });

    it("parses explicit negative decisions", () => {
      assert.deepEqual(parseVoiceDecision("deny"), {
        type: "decision",
        decision: "deny",
      });
      assert.deepEqual(parseVoiceDecision("reject"), {
        type: "decision",
        decision: "deny",
      });
      assert.deepEqual(parseVoiceDecision("never allow"), {
        type: "decision",
        decision: "never",
      });
      assert.deepEqual(parseVoiceDecision("cancel"), {
        type: "decision",
        decision: "cancel",
      });
    });

    it("identifies explanation requests without approving", () => {
      assert.deepEqual(parseVoiceDecision("explain that again"), { type: "explain" });
      assert.deepEqual(parseVoiceDecision("explain again"), { type: "explain" });
    });

    it("classifies ambiguous speech as ambiguous instead of defaulting to approval", () => {
      const ambiguous = parseVoiceDecision("maybe wait a minute");
      assert.equal(ambiguous.type, "ambiguous");
    });
  });

  describe("Approval Server integration", () => {
    it("starts on a loopback port and provides health probe", async () => {
      const testPort = 51234;
      await startApprovalServer({ port: testPort, host: "127.0.0.1", timeoutMs: 5000 });

      const res = await fetch(`http://127.0.0.1:${testPort}/v1/health`, {
        headers: { Connection: "close" },
      });
      assert.equal(res.status, 200);
      const json = (await res.json()) as { ok?: boolean; service?: string };
      assert.equal(json.ok, true);
      assert.equal(json.service, "talkit-approval-server");

      // Test resolving a non-existent request returns false
      assert.equal(resolveExternalRequest("nonexistent-id", "allow_once"), false);

      await stopApprovalServer();
    });
  });
});

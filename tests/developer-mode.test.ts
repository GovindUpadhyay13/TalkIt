import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DeveloperSessionStore } from "../src/main/developer/session-store";
import { DeveloperModeController } from "../src/main/developer/controller";
import type { DevSessionEvent } from "../src/main/developer/types";
import { extractGoogleSearchQuery, isDirectAppCommand } from "../src/main/agent/direct-executor";
import { isGitPushQuery, formatPlanForSpeech } from "../src/renderer/src/lib/dex/dev-mode-router";

describe("Talkit Developer Mode — Session Store & Evidence Grounding", () => {
  let store: DeveloperSessionStore;

  beforeEach(() => {
    store = new DeveloperSessionStore();
  });

  it("deduplicates repeated events using stable identifiers", () => {
    const event1: DevSessionEvent = {
      id: "evt-1",
      sessionId: "session-abc",
      timestamp: 1000,
      source: "antigravity",
      type: "user_prompt",
      content: "Build an auth system",
      status: "complete",
      confidence: 1.0,
      metadata: { stepIndex: 1 },
    };

    const duplicateEvent1: DevSessionEvent = {
      ...event1,
      timestamp: 1005, // slightly jittered timestamp
    };

    store.ingest(event1);
    store.ingest(duplicateEvent1);

    const events = store.getEvents("session-abc");
    assert.equal(events.length, 1, "Duplicate event with same id/stepIndex must not be added twice");
  });

  it("isolates events across different sessions without mixing", () => {
    store.ingest({
      id: "s1-e1",
      sessionId: "session-1",
      timestamp: 1000,
      source: "antigravity",
      type: "user_prompt",
      content: "Task in session 1",
      status: "complete",
      confidence: 1.0,
    });

    store.ingest({
      id: "s2-e1",
      sessionId: "session-2",
      timestamp: 1010,
      source: "antigravity",
      type: "user_prompt",
      content: "Task in session 2",
      status: "complete",
      confidence: 1.0,
    });

    const s1Events = store.getEvents("session-1");
    const s2Events = store.getEvents("session-2");

    assert.equal(s1Events.length, 1);
    assert.equal(s2Events.length, 1);
    assert.equal(s1Events[0].content, "Task in session 1");
    assert.equal(s2Events[0].content, "Task in session 2");
  });

  it("reports missing prompts as unavailable and does not fabricate a verbatim prompt", () => {
    // Only agent response present, no user_prompt
    store.ingest({
      id: "e-resp-1",
      sessionId: "session-no-prompt",
      timestamp: 1100,
      source: "antigravity",
      type: "agent_response",
      content: "I have initialized the database configuration.",
      status: "complete",
      confidence: 1.0,
    });

    const summary = store.generateCatchMeUpSummary("session-no-prompt");
    assert.equal(summary.hasOriginalPrompt, false);
    assert.ok(
      summary.originalPrompt.toLowerCase().includes("unavailable"),
      "Must state that original request is unavailable"
    );
  });

  it("strictly separates agent-reported completion from verified completion", () => {
    // Agent claims it created auth module
    store.ingest({
      id: "e-resp-2",
      sessionId: "session-verify-test",
      timestamp: 1200,
      source: "antigravity",
      type: "agent_response",
      content: "I have created the auth module and added user login.",
      status: "complete",
      confidence: 1.0,
    });

    const summaryBeforeVerification = store.generateCatchMeUpSummary("session-verify-test");
    assert.equal(
      summaryBeforeVerification.verifiedWork.length,
      0,
      "Agent claim without independent command/test result must NOT be verified"
    );
    assert.ok(
      summaryBeforeVerification.reportedWork.length > 0,
      "Claim should be registered as agent-reported"
    );

    // Now record independent verification: test passing
    store.ingest({
      id: "e-test-1",
      sessionId: "session-verify-test",
      timestamp: 1300,
      source: "antigravity",
      type: "test_result",
      content: "pass 4 | fail 0",
      status: "complete",
      confidence: 1.0,
      payload: { suite: "auth.test.ts", passed: 4, failed: 0, status: "passed" },
    });

    const summaryAfterVerification = store.generateCatchMeUpSummary("session-verify-test");
    assert.ok(
      summaryAfterVerification.verifiedWork.some((w) => w.includes("Test Suite auth.test.ts passed")),
      "Verified work must include the verified test result"
    );
  });

  it("does not treat a command invocation without a result as successful", () => {
    // Command started without completed result
    store.ingest({
      id: "cmd-start-1",
      sessionId: "session-cmd-test",
      timestamp: 1400,
      source: "antigravity",
      type: "command_started",
      content: "npm run build",
      status: "partial",
      confidence: 0.8,
      payload: { command: "npm run build" },
    });

    const summary = store.generateCatchMeUpSummary("session-cmd-test");
    assert.equal(
      summary.verifiedWork.length,
      0,
      "A command started without exit code 0 must not be treated as verified"
    );
    assert.ok(
      summary.workInProgress.some((w) => w.includes("npm run build")),
      "Incomplete command must be listed under work in progress"
    );
  });

  it("records failed commands and blockers accurately", () => {
    store.ingest({
      id: "cmd-fail-1",
      sessionId: "session-fail-test",
      timestamp: 1500,
      source: "antigravity",
      type: "command_failed",
      content: "The command exited with code 1. TS2304: Cannot find name 'foo'.",
      status: "complete",
      confidence: 1.0,
      payload: { command: "npm run build", exitCode: 1, error: "TS2304" },
    });

    const summary = store.generateCatchMeUpSummary("session-fail-test");
    assert.ok(summary.failedItems.length > 0);
    assert.ok(summary.failedItems[0].includes("code 1"));
  });

  it("does not report stale or resolved permission requests as currently pending", () => {
    store.ingest({
      id: "perm-req-1",
      sessionId: "session-perm-test",
      timestamp: 1600,
      source: "approval_server",
      type: "permission_requested",
      content: "Run bash script deploy.sh",
      status: "complete",
      confidence: 1.0,
      payload: { requestId: "req-1", action: "Run bash", target: "deploy.sh" },
    });

    let summary = store.generateCatchMeUpSummary("session-perm-test");
    assert.equal(summary.pendingApprovals.length, 1);

    // Resolve the permission
    store.ingest({
      id: "perm-res-1",
      sessionId: "session-perm-test",
      timestamp: 1650,
      source: "approval_server",
      type: "permission_resolved",
      content: "Approved",
      status: "complete",
      confidence: 1.0,
      payload: { requestId: "req-1", decision: "allow" },
    });

    summary = store.generateCatchMeUpSummary("session-perm-test");
    assert.equal(
      summary.pendingApprovals.length,
      0,
      "Resolved permission request must not remain in pending approvals"
    );
  });

  it("flags capture gaps when disconnected intervals occur", () => {
    store.recordGap("session-gap-test", "Collector disconnected unexpectedly", 2000, 2500);

    const summary = store.generateCatchMeUpSummary("session-gap-test");
    assert.ok(summary.hasGaps);
    assert.ok(summary.gaps.length > 0);
    assert.ok(summary.gaps[0].includes("disconnected"));
  });

  it("labels newly generated implementation plans as proposals rather than original plans", () => {
    store.ingest({
      id: "prompt-plan",
      sessionId: "session-plan-test",
      timestamp: 3000,
      source: "antigravity",
      type: "user_prompt",
      content: "Refactor database models and add migration tests",
      status: "complete",
      confidence: 1.0,
    });

    const plan = store.generateImplementationPlanSummary("session-plan-test");
    assert.equal(
      plan.isProposed,
      true,
      "Generated plan must be labeled as newly generated proposal"
    );
    assert.ok(plan.steps.length > 0);
    assert.ok(plan.steps[0].verificationCriteria);
  });

  it("clears stored data and resets active sessions cleanly", () => {
    store.ingest({
      id: "to-clear",
      sessionId: "session-clear",
      timestamp: 4000,
      source: "antigravity",
      type: "user_prompt",
      content: "Hello",
      status: "complete",
      confidence: 1.0,
    });

    assert.equal(store.getEvents("session-clear").length, 1);
    store.clear("session-clear");
    assert.equal(store.getEvents("session-clear").length, 0);
  });

  it("formats catch-me-up summary strictly into 5 structured lines", () => {
    store.ingest({
      id: "prompt-1",
      sessionId: "session-5line",
      timestamp: 1000,
      source: "antigravity",
      type: "user_prompt",
      content: "Add GitHub direct push feature",
      status: "complete",
      confidence: 1.0,
    });
    const summary = store.generateCatchMeUpSummary("session-5line");
    const lines = summary.summary.split("\n");
    assert.equal(lines.length, 5, "Catch-me-up summary must have strictly 5 lines");
    assert.match(lines[0], /^1\. Goal:/);
    assert.match(lines[1], /^2\. Verified:/);
    assert.match(lines[2], /^3\. Reported:/);
    assert.match(lines[3], /^4\. Active & Blockers:/);
    assert.match(lines[4], /^5\. Next Steps:/);
  });

  it("generates an implementation plan with strictly 10 steps and 10 speech lines", () => {
    const plan = store.generateImplementationPlanSummary("session-10step");
    assert.equal(plan.steps.length, 10, "Implementation plan must have strictly 10 steps");
    for (let i = 0; i < 10; i++) {
      assert.equal(plan.steps[i].stepNumber, i + 1);
      assert.ok(plan.steps[i].description.length > 0);
    }
    const speechLines = formatPlanForSpeech(plan).split("\n");
    assert.equal(speechLines.length, 10, "Spoken implementation plan must produce strictly 10 lines");
  });

  it("classifies voice git push commands in developer mode", () => {
    assert.equal(isGitPushQuery("push changes to github"), true);
    assert.equal(isGitPushQuery("push to github"), true);
    assert.equal(isGitPushQuery("commit and push"), true);
    assert.equal(isGitPushQuery("git push"), true);
    assert.equal(isGitPushQuery("open calculator"), false);
  });
});

describe("Talkit Developer Mode — Lifecycle & Controller", () => {
  it("defaults to disabled with zero background collection", async () => {
    const controller = new DeveloperModeController();
    const state = controller.getState();
    assert.equal(state.enabled, false);
    assert.equal(state.connectionStatus, "disconnected");
    assert.equal(state.eventCount, 0);
  });

  it("enabling and disabling developer mode cleans up subscriptions", async () => {
    const controller = new DeveloperModeController();
    let stateChanges = 0;
    const unsub = controller.onStateChange(() => {
      stateChanges++;
    });

    const enabledState = await controller.enable();
    assert.equal(enabledState.enabled, true);

    const disabledState = await controller.disable();
    assert.equal(disabledState.enabled, false);
    assert.equal(disabledState.connectionStatus, "disconnected");

    assert.ok(stateChanges >= 2);
    unsub();
  });

  it("preserves Write Mode and Execute Mode integrity", () => {
    // Verify Execute Mode Google search routing remains intact
    const searchQuery = extractGoogleSearchQuery("search on google for nextjs 15 app router");
    assert.equal(searchQuery, "nextjs 15 app router");

    // Verify app execution recognition remains intact
    assert.equal(isDirectAppCommand("open notepad"), true);
    assert.equal(isDirectAppCommand("launch calculator"), true);
  });
});

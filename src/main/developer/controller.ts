import { AntigravitySessionAdapter, type AntigravityAdapterOptions } from "./adapters/antigravity-adapter";
import { ApprovalServerAdapter } from "./adapters/approval-adapter";
import type { SessionCollector } from "./collector";
import { DeveloperSessionStore } from "./session-store";
import { devModeGitPush } from "./git-sync";
import type {
  DevCatchMeUpSummary,
  DevGitPushResult,
  DevImplementationPlanSummary,
  DevModeState,
  DevSessionEvent,
  DevSessionSourceType,
} from "./types";

export type DevStateChangeListener = (state: DevModeState) => void;

/**
 * DeveloperModeController coordinates the Developer Mode lifecycle.
 *
 * Rules:
 * - Developer Mode is strictly separated from Write Mode and Execute Mode.
 * - Monitoring only begins after explicit user activation on the screen.
 * - Disabling Developer Mode disposes all watchers/timers and halts collection.
 * - Opening TalkIt never silently re-engages monitoring.
 */
export class DeveloperModeController {
  private enabled = false;
  private monitoring = false;
  private currentSource: DevSessionSourceType = "antigravity";
  private store: DeveloperSessionStore;
  private collectors: SessionCollector[] = [];
  private stateListeners = new Set<DevStateChangeListener>();
  private lastGapReason?: string;

  constructor() {
    this.store = new DeveloperSessionStore();
  }

  public getState(): DevModeState {
    const activeApprovals = this.store.getPendingApprovals();
    const latestSummary = this.enabled ? this.store.generateCatchMeUpSummary(this.currentSource) : undefined;

    const isConn = this.monitoring && this.store.getEventCount() > 0;
    const connectionStatus: "connected" | "connecting" | "disconnected" = !this.enabled
      ? "disconnected"
      : isConn
      ? "connected"
      : "connecting";

    return {
      enabled: this.enabled,
      monitoring: this.monitoring,
      source: this.currentSource,
      connectionStatus,
      sessionId: this.store.getSessionId(),
      activeSessionId: this.store.getSessionId(),
      workspacePath: this.store.getWorkspacePath(),
      activeWorkspace: this.store.getWorkspacePath() || null,
      connected: isConn,
      lastEventTimestamp: this.store.getLatestEvent()?.timestamp
        ? new Date(this.store.getLatestEvent()!.timestamp).toISOString()
        : null,
      eventCount: this.store.getEventCount(),
      hasGaps: this.store.getGaps().length > 0,
      gapReason: this.lastGapReason || this.store.getGaps()[0],
      activePendingApprovalsCount: activeApprovals.length,
      latestSummary,
    };
  }

  public onStateChange(listener: DevStateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyStateChange() {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.warn("[TalkIt DevMode] Error notifying state listener", err);
      }
    }
  }

  /**
   * Explicitly enables Developer Mode and begins background monitoring.
   */
  public async enable(
    sourceType: DevSessionSourceType = "antigravity",
    options?: AntigravityAdapterOptions,
  ): Promise<DevModeState> {
    if (this.enabled && this.monitoring) {
      return this.getState();
    }

    this.enabled = true;
    this.currentSource = sourceType;
    this.lastGapReason = undefined;

    // Initialize adapters based on selected source
    await this.stopCollectors();
    this.collectors = [];

    // 1. Primary IDE source adapter
    if (sourceType === "antigravity") {
      const antigravity = new AntigravitySessionAdapter(options);
      this.collectors.push(antigravity);
    }

    // 2. Approval server adapter (always active when developer mode is enabled)
    this.collectors.push(new ApprovalServerAdapter());

    // 3. Start monitoring on all collectors
    this.monitoring = true;

    for (const collector of this.collectors) {
      const handleEvent = (event: DevSessionEvent) => {
        if (!this.monitoring) return;
        if (collector.getCurrentSessionId?.()) {
          this.store.setSessionId(collector.getCurrentSessionId()!);
        }
        this.store.addEvent(event);
        this.notifyStateChange();
      };

      const handleGap = (gapMsg: string) => {
        this.lastGapReason = gapMsg;
        this.store.recordGap(gapMsg);
        this.notifyStateChange();
      };

      void collector.start(handleEvent, handleGap);
    }

    this.notifyStateChange();
    return this.getState();
  }

  /**
   * Explicitly disables Developer Mode, halting monitoring and cleaning up all watchers.
   */
  public async disable(): Promise<DevModeState> {
    this.enabled = false;
    this.monitoring = false;

    await this.stopCollectors();
    this.notifyStateChange();
    return this.getState();
  }

  /**
   * Toggles Developer Mode on or off from the user screen.
   */
  public async toggle(
    sourceType?: DevSessionSourceType,
    options?: AntigravityAdapterOptions,
  ): Promise<DevModeState> {
    if (this.enabled) {
      return this.disable();
    } else {
      return this.enable(sourceType, options);
    }
  }

  private async stopCollectors() {
    for (const collector of this.collectors) {
      try {
        await collector.stop();
      } catch (err) {
        console.warn("[TalkIt DevMode] Error stopping collector:", err);
      }
    }
    this.collectors = [];
  }

  /**
   * Generates a "Catch Me Up" summary from available session evidence.
   */
  public catchMeUp(): DevCatchMeUpSummary {
    return this.store.generateCatchMeUpSummary(this.currentSource);
  }

  /**
   * Generates or retrieves the Implementation Plan summary.
   */
  public getImplementationPlan(): DevImplementationPlanSummary {
    return this.store.generateImplementationPlanSummary();
  }

  /**
   * Answers a freeform query grounded in captured session evidence.
   */
  public answerSessionQuestion(query: string): {
    answer: string;
    evidenceFound: boolean;
    evidenceItems: string[];
  } {
    const q = query.toLowerCase();
    const summary = this.store.generateCatchMeUpSummary(this.currentSource);
    const evidenceItems: string[] = [];

    // Question: What has been implemented / completed?
    if (q.includes("what has been implemented") || q.includes("what is completed") || q.includes("what did you do") || q.includes("work done")) {
      const verified = summary.verifiedCompleted;
      const reported = summary.reportedCompleted;

      if (verified.length === 0 && reported.length === 0) {
        return {
          answer: "No completed implementation items have been recorded in the active session.",
          evidenceFound: false,
          evidenceItems: [],
        };
      }

      const parts: string[] = [];
      if (verified.length > 0) {
        parts.push(`**Independently Verified Completed Work**:\n${verified.map((v) => `- ${v}`).join("\n")}`);
        evidenceItems.push(...verified);
      }
      if (reported.length > 0) {
        parts.push(`**Agent-Reported Progress (Unverified)**:\n${reported.map((r) => `- ${r}`).join("\n")}`);
        evidenceItems.push(...reported);
      }

      return {
        answer: parts.join("\n\n"),
        evidenceFound: true,
        evidenceItems,
      };
    }

    // Question: What is pending / remaining?
    if (q.includes("what is pending") || q.includes("what is remaining") || q.includes("remaining tasks") || q.includes("what is left")) {
      const remaining = summary.remainingTasks;
      const inProgress = summary.workInProgress;

      if (remaining.length === 0 && inProgress.length === 0) {
        return {
          answer: "All observed tasks appear to be settled; no outstanding errors, failing tests, or pending approvals were found in the current session data.",
          evidenceFound: true,
          evidenceItems: ["No failing tests or pending approvals in active session store."],
        };
      }

      const parts: string[] = [];
      if (inProgress.length > 0) {
        parts.push(`**Work in Progress**:\n${inProgress.map((w) => `- ${w}`).join("\n")}`);
        evidenceItems.push(...inProgress);
      }
      if (remaining.length > 0) {
        parts.push(`**Pending / Outstanding Items**:\n${remaining.map((r) => `- ${r}`).join("\n")}`);
        evidenceItems.push(...remaining);
      }

      return {
        answer: parts.join("\n\n"),
        evidenceFound: true,
        evidenceItems,
      };
    }

    // Question: Errors / Failures
    if (q.includes("error") || q.includes("fail") || q.includes("failed") || q.includes("broken") || q.includes("blocker")) {
      const failedCmds = summary.failedCommands;
      const failedTests = summary.failedTests;

      if (failedCmds.length === 0 && failedTests.length === 0) {
        return {
          answer: "No command failures or failing tests were recorded in this session.",
          evidenceFound: true,
          evidenceItems: ["Zero command failures recorded."],
        };
      }

      const parts: string[] = [];
      if (failedCmds.length > 0) {
        parts.push(`**Failed Commands (${failedCmds.length})**:\n${failedCmds.map((c) => `- \`${c.command}\` (exit code ${c.exitCode})`).join("\n")}`);
        evidenceItems.push(...failedCmds.map((c) => `Failed command: ${c.command}`));
      }
      if (failedTests.length > 0) {
        parts.push(`**Failed Tests (${failedTests.length})**:\n${failedTests.map((t) => `- \`${t.command}\``).join("\n")}`);
        evidenceItems.push(...failedTests.map((t) => `Failed test: ${t.command}`));
      }

      return {
        answer: parts.join("\n\n"),
        evidenceFound: true,
        evidenceItems,
      };
    }

    // Default: Grounded answer from latest summary
    const facts: string[] = [];
    if (summary.hasOriginalPrompt && summary.originalPrompt) {
      facts.push(`Original user request: "${summary.originalPrompt.slice(0, 100)}..."`);
    } else {
      facts.push("Original user prompt was not captured or is unavailable.");
    }
    facts.push(`Verified completed items: ${summary.verifiedCompleted.length}`);
    facts.push(`Active pending approvals: ${summary.pendingApprovals.length}`);

    return {
      answer: `Based on available evidence in session \`${this.store.getSessionId()}\`:\n` +
        facts.map((f) => `- ${f}`).join("\n") +
        "\n\nSay or click **\"Catch me up\"** for a complete structured summary.",
      evidenceFound: true,
      evidenceItems: facts,
    };
  }

  /**
   * Clears the current session data.
   */
  public clearSession(): void {
    this.store.clear();
    this.notifyStateChange();
  }

  /**
   * In Developer Mode: Directly stages all files (`git add .`), creates a commit,
   * and pushes changes to GitHub.
   */
  public async gitPush(commitMessage?: string): Promise<DevGitPushResult> {
    const res = await devModeGitPush(commitMessage, this.store.getWorkspacePath());
    if (res.ok) {
      // Record verification event in store
      this.store.ingest({
        id: `git-push-${Date.now()}`,
        sessionId: this.store.getSessionId(),
        timestamp: Date.now(),
        source: "custom_log",
        type: "command_completed",
        content: res.message || "Git commit & push to GitHub completed successfully.",
        status: "complete",
        confidence: 1.0,
        payload: {
          command: "git push",
          commitHash: res.commitHash,
          branch: res.branch,
          filesChanged: res.filesChanged,
          exitCode: 0,
        },
      });
      this.notifyStateChange();
    }
    return res;
  }

  public getStore(): DeveloperSessionStore {
    return this.store;
  }
}

// Singleton controller instance for the main process
export const devModeController = new DeveloperModeController();

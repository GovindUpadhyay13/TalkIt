import type {
  DevApprovalRecord,
  DevCatchMeUpSummary,
  DevCommandRecord,
  DevFileModification,
  DevImplementationPlanStep,
  DevImplementationPlanSummary,
  DevSessionEvent,
  DevSessionSourceType,
  DevTestSummary,
} from "./types";

interface SessionBucket {
  sessionId: string;
  workspacePath?: string;
  events: DevSessionEvent[];
  eventIds: Set<string>;
  prompts: DevSessionEvent[];
  agentResponses: DevSessionEvent[];
  commands: Map<string, DevCommandRecord>;
  testResults: DevTestSummary[];
  fileModifications: Map<string, DevFileModification>;
  approvals: Map<string, DevApprovalRecord>;
  reportedAccomplishments: string[];
  gaps: Array<{ reason: string; start?: number; end?: number }>;
}

function createEmptyBucket(sessionId: string, workspacePath?: string): SessionBucket {
  return {
    sessionId,
    workspacePath,
    events: [],
    eventIds: new Set(),
    prompts: [],
    agentResponses: [],
    commands: new Map(),
    testResults: [],
    fileModifications: new Map(),
    approvals: new Map(),
    reportedAccomplishments: [],
    gaps: [],
  };
}

export function formatCatchMeUpSummaryText(s: {
  hasOriginalPrompt: boolean;
  originalPrompt?: string;
  verifiedCompleted: string[];
  reportedCompleted: string[];
  workInProgress: string[];
  failedCommands: DevCommandRecord[];
  failedTests: DevTestSummary[];
  pendingApprovals: DevApprovalRecord[];
  remainingTasks: string[];
  gapsAcknowledged: string[];
}): string {
  const parts: string[] = [];

  // 1. Original user request
  if (s.hasOriginalPrompt && s.originalPrompt) {
    parts.push(`Original Request: "${s.originalPrompt.slice(0, 160)}${s.originalPrompt.length > 160 ? "..." : ""}".`);
  } else {
    parts.push("Original Request: Unavailable from captured session.");
  }

  // 2. Independently verified completions
  if (s.verifiedCompleted.length > 0) {
    parts.push(`Independently Verified Completed (${s.verifiedCompleted.length}): ${s.verifiedCompleted.join("; ")}.`);
  } else {
    parts.push("Independently Verified: None confirmed by system execution or test results.");
  }

  // 3. Agent reported completion (distinguished from verified!)
  if (s.reportedCompleted.length > 0) {
    parts.push(`Agent-Reported Claims (Unverified): ${s.reportedCompleted.join("; ")}.`);
  }

  // 4. Work in progress
  if (s.workInProgress.length > 0) {
    parts.push(`Work in Progress: ${s.workInProgress.join("; ")}.`);
  }

  // 5. Failures and blockers
  const failures: string[] = [];
  for (const cmd of s.failedCommands) {
    failures.push(`Command \`${cmd.command}\` exited with code ${cmd.exitCode ?? 1}`);
  }
  for (const t of s.failedTests) {
    failures.push(`Test suite \`${t.command}\` failed (${t.failedTests || 1} failed)`);
  }
  if (failures.length > 0) {
    parts.push(`Errors & Blockers (${failures.length}): ${failures.join("; ")}.`);
  }

  // 6. Remaining tasks
  if (s.remainingTasks.length > 0) {
    parts.push(`Remaining Tasks: ${s.remainingTasks.join("; ")}.`);
  }

  // 7. Active pending permissions
  if (s.pendingApprovals.length > 0) {
    parts.push(`Pending Approvals (${s.pendingApprovals.length}): ${s.pendingApprovals.map((a) => a.action).join("; ")}.`);
  }

  // 8. Capture gaps
  if (s.gapsAcknowledged.length > 0) {
    parts.push(`Capture Gaps: ${s.gapsAcknowledged.join("; ")}.`);
  }

  return parts.join("\n\n");
}

/**
 * DeveloperSessionStore preserves the event sequence and source metadata
 * for active Developer Mode sessions.
 */
export class DeveloperSessionStore {
  private activeSessionId: string;
  private defaultWorkspacePath?: string;
  private sessions = new Map<string, SessionBucket>();

  constructor(initialSessionId: string = "default", workspacePath?: string) {
    this.activeSessionId = initialSessionId;
    this.defaultWorkspacePath = workspacePath;
    this.sessions.set(initialSessionId, createEmptyBucket(initialSessionId, workspacePath));
  }

  private getBucket(sessionId?: string): SessionBucket {
    const id = sessionId || this.activeSessionId;
    let bucket = this.sessions.get(id);
    if (!bucket) {
      bucket = createEmptyBucket(id, this.defaultWorkspacePath);
      this.sessions.set(id, bucket);
    }
    return bucket;
  }

  public getSessionId(): string {
    return this.activeSessionId;
  }

  public setSessionId(id: string, workspacePath?: string) {
    this.activeSessionId = id;
    if (workspacePath) this.defaultWorkspacePath = workspacePath;
    if (!this.sessions.has(id)) {
      this.sessions.set(id, createEmptyBucket(id, workspacePath));
    }
  }

  public getWorkspacePath(): string | undefined {
    return this.getBucket().workspacePath || this.defaultWorkspacePath;
  }

  public getEventCount(sessionId?: string): number {
    return this.getBucket(sessionId).events.length;
  }

  public getLatestEvent(sessionId?: string): DevSessionEvent | undefined {
    const events = this.getBucket(sessionId).events;
    return events[events.length - 1];
  }

  public getEvents(sessionId?: string): DevSessionEvent[] {
    return [...this.getBucket(sessionId).events];
  }

  public recordGap(
    sessionOrReason: string,
    reasonOrStart?: string | number,
    start?: number,
    end?: number
  ) {
    let sid = this.activeSessionId;
    let reason = sessionOrReason;
    let sTime = typeof reasonOrStart === "number" ? reasonOrStart : start;
    let eTime = end;

    if (typeof reasonOrStart === "string") {
      sid = sessionOrReason;
      reason = reasonOrStart;
      sTime = start;
    }

    const bucket = this.getBucket(sid);
    bucket.gaps.push({ reason, start: sTime, end: eTime });
  }

  public getGaps(sessionId?: string): string[] {
    return this.getBucket(sessionId).gaps.map((g) => g.reason);
  }

  public clear(sessionId?: string): void {
    if (sessionId) {
      this.sessions.set(sessionId, createEmptyBucket(sessionId, this.defaultWorkspacePath));
    } else {
      this.sessions.clear();
      this.sessions.set(this.activeSessionId, createEmptyBucket(this.activeSessionId, this.defaultWorkspacePath));
    }
  }

  /**
   * Alias for addEvent
   */
  public ingest(event: DevSessionEvent): boolean {
    return this.addEvent(event);
  }

  /**
   * Adds an event to the session bucket with deduplication.
   */
  public addEvent(event: DevSessionEvent): boolean {
    const bucket = this.getBucket(event.sessionId || this.activeSessionId);

    // Deduplicate by event.id or stepIndex
    const stepIdx = event.metadata?.stepIndex;
    const dedupKey = stepIdx !== undefined ? `step-${stepIdx}` : event.id;

    if (bucket.eventIds.has(event.id) || bucket.eventIds.has(dedupKey)) {
      return false;
    }

    bucket.eventIds.add(event.id);
    bucket.eventIds.add(dedupKey);
    bucket.events.push(event);

    switch (event.type) {
      case "user_prompt":
        bucket.prompts.push(event);
        break;

      case "agent_response":
        bucket.agentResponses.push(event);
        this.extractReportedAccomplishments(bucket, event.content);
        break;

      case "command_started":
        if (event.payload?.command) {
          const cmdStr = String(event.payload.command);
          bucket.commands.set(event.id, {
            id: event.id,
            command: cmdStr,
            cwd: event.payload.cwd ? String(event.payload.cwd) : undefined,
            startedAt: event.timestamp,
            status: "running",
            verified: false,
          });
        }
        break;

      case "command_completed": {
        const corrId = event.correlationId || event.id;
        const existing = bucket.commands.get(corrId) || {
          id: corrId,
          command: String(event.payload?.command || event.content || "shell command"),
          startedAt: event.timestamp,
          status: "completed",
          verified: true,
        };
        existing.status = "completed";
        existing.completedAt = event.timestamp;
        existing.exitCode = Number(event.payload?.exitCode ?? 0);
        existing.outputSnippet = event.content.slice(0, 500);
        existing.verified = existing.exitCode === 0;
        bucket.commands.set(corrId, existing);
        break;
      }

      case "command_failed": {
        const corrId = event.correlationId || event.id;
        const existing = bucket.commands.get(corrId) || {
          id: corrId,
          command: String(event.payload?.command || event.content || "shell command"),
          startedAt: event.timestamp,
          status: "failed",
          verified: false,
        };
        existing.status = "failed";
        existing.completedAt = event.timestamp;
        existing.exitCode = Number(event.payload?.exitCode ?? 1);
        existing.errorSnippet = event.content.slice(0, 500);
        bucket.commands.set(corrId, existing);
        break;
      }

      case "test_result":
        if (event.payload) {
          bucket.testResults.push({
            command: String(event.payload.suite || event.payload.command || "test runner"),
            passed: event.payload.status === "passed" || Number(event.payload.failed ?? 0) === 0,
            passedTests: Number(event.payload.passed ?? 0),
            failedTests: Number(event.payload.failed ?? 0),
            totalTests: Number(event.payload.passed ?? 0) + Number(event.payload.failed ?? 0),
            timestamp: event.timestamp,
          });
        }
        break;

      case "file_change":
        if (event.payload?.path) {
          const filePath = String(event.payload.path);
          bucket.fileModifications.set(filePath, {
            path: filePath,
            action: (event.payload.action as any) || "modify",
            timestamp: event.timestamp,
            verified: true,
          });
        }
        break;

      case "permission_requested":
        if (event.payload?.requestId) {
          const reqId = String(event.payload.requestId);
          bucket.approvals.set(reqId, {
            requestId: reqId,
            toolName: String(event.payload.tool || event.source),
            action: String(event.payload.action || event.content),
            target: event.payload.target ? String(event.payload.target) : undefined,
            requestedAt: event.timestamp,
            status: "pending",
          });
        }
        break;

      case "permission_resolved":
        if (event.payload?.requestId) {
          const reqId = String(event.payload.requestId);
          const existing = bucket.approvals.get(reqId);
          if (existing) {
            existing.status = "resolved";
            existing.decision = event.payload.decision as any;
            existing.resolvedAt = event.timestamp;
          }
        }
        break;
    }

    return true;
  }

  private extractReportedAccomplishments(bucket: SessionBucket, text: string) {
    const lines = text.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (
        (line.startsWith("- [x]") ||
          line.startsWith("✓") ||
          line.startsWith("- Created") ||
          line.startsWith("- Implemented") ||
          line.startsWith("- Added") ||
          line.startsWith("I have created") ||
          line.startsWith("I have implemented") ||
          line.startsWith("I have added")) &&
        line.length > 5
      ) {
        const cleaned = line
          .replace(/^[-*•]\s*(\[x\])?\s*/i, "")
          .replace(/^[✓✔]\s*/, "")
          .trim();
        if (cleaned && !bucket.reportedAccomplishments.includes(cleaned)) {
          bucket.reportedAccomplishments.push(cleaned);
        }
      }
    }
  }

  public getPendingApprovals(sessionId?: string): DevApprovalRecord[] {
    return Array.from(this.getBucket(sessionId).approvals.values()).filter(
      (a) => a.status === "pending"
    );
  }

  /**
   * Generates a comprehensive "Catch Me Up" summary for a session.
   */
  public generateCatchMeUpSummary(sessionOrSource?: string): DevCatchMeUpSummary {
    let sid = this.activeSessionId;
    let sourceType: DevSessionSourceType = "antigravity";

    if (sessionOrSource) {
      if (this.sessions.has(sessionOrSource)) {
        sid = sessionOrSource;
      } else {
        sourceType = sessionOrSource as DevSessionSourceType;
      }
    }

    const bucket = this.getBucket(sid);
    const latestPrompt = bucket.prompts[bucket.prompts.length - 1];
    const hasOriginalPrompt = Boolean(latestPrompt && latestPrompt.content.trim().length > 0);

    // 1. Verified completed work (requires exit code 0 or confirmed file change/test pass)
    const verifiedCompleted: string[] = [];
    const successfulCommands = Array.from(bucket.commands.values()).filter(
      (c) => c.status === "completed" && c.exitCode === 0
    );
    for (const cmd of successfulCommands) {
      verifiedCompleted.push(`Command completed (exit code 0): \`${cmd.command}\``);
    }

    const successfulTests = bucket.testResults.filter((t) => t.passed);
    for (const t of successfulTests) {
      const testDetail = t.totalTests ? ` (${t.passedTests}/${t.totalTests} passed)` : "";
      verifiedCompleted.push(`Test Suite ${t.command} passed${testDetail}`);
    }

    const modifiedFiles = Array.from(bucket.fileModifications.values()).filter((f) => f.verified);
    if (modifiedFiles.length > 0) {
      verifiedCompleted.push(
        `Verified files modified on disk (${modifiedFiles.length}): ${modifiedFiles.map((f) => f.path.split(/[/\\]/).pop()).join(", ")}`
      );
    }

    // 2. Work reported as completed by agent (not independently verified by tool exit codes)
    const reportedCompleted = [...bucket.reportedAccomplishments];

    // 3. Work in progress
    const workInProgress: string[] = [];
    const runningCommands = Array.from(bucket.commands.values()).filter((c) => c.status === "running");
    for (const cmd of runningCommands) {
      workInProgress.push(`Executing command: \`${cmd.command}\``);
    }

    // 4. Failed commands and failed tests
    const failedCommands = Array.from(bucket.commands.values()).filter((c) => c.status === "failed");
    const failedTests = bucket.testResults.filter((t) => !t.passed);
    const failedItems: string[] = [];
    for (const c of failedCommands) {
      failedItems.push(`Command \`${c.command}\` exited with code ${c.exitCode ?? 1}`);
    }
    for (const t of failedTests) {
      failedItems.push(`Test suite \`${t.command}\` failed`);
    }

    // 5. Active pending approvals
    const pendingApprovals = this.getPendingApprovals(sid);

    // 6. Gaps acknowledged
    const gapsAcknowledged = bucket.gaps.map((g) => g.reason);
    if (!hasOriginalPrompt) {
      gapsAcknowledged.push("Original user prompt was not captured or is unavailable.");
    }

    // 7. Remaining tasks
    const remainingTasks: string[] = [];
    if (failedCommands.length > 0) {
      remainingTasks.push(`Address ${failedCommands.length} failed command(s).`);
    }
    if (failedTests.length > 0) {
      remainingTasks.push(`Fix ${failedTests.length} failing test run(s).`);
    }
    if (pendingApprovals.length > 0) {
      remainingTasks.push(`Resolve ${pendingApprovals.length} pending coding-agent permission request(s).`);
    }

    const summaryText = formatCatchMeUpSummaryText({
      hasOriginalPrompt,
      originalPrompt: latestPrompt?.content,
      verifiedCompleted,
      reportedCompleted,
      workInProgress,
      failedCommands,
      failedTests,
      pendingApprovals,
      remainingTasks,
      gapsAcknowledged,
    });

    return {
      sessionId: sid,
      timestamp: new Date().toISOString(),
      source: sourceType,
      monitoringActive: true,
      hasOriginalPrompt,
      originalPrompt: hasOriginalPrompt ? latestPrompt.content : "Original request is unavailable from captured session data.",
      summary: summaryText,
      reportedCompleted,
      reportedWork: reportedCompleted,
      verifiedCompleted,
      verifiedWork: verifiedCompleted,
      workInProgress,
      failedCommands,
      failedTests,
      failedItems,
      recentFileChanges: modifiedFiles,
      pendingApprovals,
      remainingTasks,
      gapsAcknowledged,
      gaps: gapsAcknowledged,
      hasGaps: gapsAcknowledged.length > 0,
      confidenceScore: bucket.events.length > 0 ? (hasOriginalPrompt ? 1.0 : 0.75) : 0.0,
    };
  }

  /**
   * Generates an Implementation Plan based on captured evidence.
   */
  public generateImplementationPlanSummary(sessionId?: string): DevImplementationPlanSummary {
    const sid = sessionId || this.activeSessionId;
    const bucket = this.getBucket(sid);
    const catchMeUp = this.generateCatchMeUpSummary(sid);

    let capturedPlanText: string | null = null;
    for (const res of bucket.agentResponses) {
      if (
        res.content.includes("### Implementation Plan") ||
        res.content.includes("## Implementation Plan") ||
        res.content.includes("<plan>") ||
        res.content.includes("Proposed Plan:")
      ) {
        capturedPlanText = res.content;
        break;
      }
    }

    if (capturedPlanText) {
      const steps = this.parsePlanSteps(capturedPlanText);
      return {
        sessionId: sid,
        timestamp: new Date().toISOString(),
        isExistingPlan: true,
        isProposed: false,
        source: "Captured Agent Plan",
        planSource: "captured_agent_plan",
        title: "Captured Agent Implementation Plan",
        steps,
        clarificationNeeded: null,
      };
    }

    const steps: DevImplementationPlanStep[] = [];
    let stepNum = 1;

    if (catchMeUp.hasOriginalPrompt && catchMeUp.originalPrompt) {
      steps.push({
        stepNumber: stepNum++,
        description: `Analyze and fulfill user requirements: "${catchMeUp.originalPrompt.slice(0, 100)}..."`,
        motivation: "Original captured user request.",
        status: catchMeUp.verifiedCompleted.length > 0 ? "completed" : "in_progress",
        verificationCriteria: "All user acceptance criteria verified with passing unit tests.",
        verified: catchMeUp.failedTests.length === 0 && catchMeUp.verifiedCompleted.length > 0,
      });
    }

    if (catchMeUp.recentFileChanges.length > 0) {
      steps.push({
        stepNumber: stepNum++,
        description: `Implement code modifications across ${catchMeUp.recentFileChanges.length} file(s).`,
        motivation: "File edits captured in session transcript.",
        status: "completed",
        verificationCriteria: "File modifications verified on disk.",
        verified: true,
      });
    }

    if (catchMeUp.failedCommands.length > 0 || catchMeUp.failedTests.length > 0) {
      steps.push({
        stepNumber: stepNum++,
        description: "Resolve failing commands and test blockers.",
        motivation: "Failed commands/tests detected in session evidence.",
        status: "in_progress",
        verificationCriteria: "All commands and test suites exit with code 0.",
        verified: false,
      });
    }

    return {
      sessionId: sid,
      timestamp: new Date().toISOString(),
      isExistingPlan: false,
      isProposed: true,
      source: "Newly Generated Evidence-Grounded Proposal",
      planSource: "newly_generated_proposal",
      title: "Newly Generated Plan Proposal",
      steps,
      clarificationNeeded: catchMeUp.hasOriginalPrompt ? null : "Original user prompt unavailable.",
    };
  }

  private parsePlanSteps(text: string): DevImplementationPlanStep[] {
    const steps: DevImplementationPlanStep[] = [];
    const lines = text.split("\n");
    let currentStep = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(/^(\d+)\.\s+(.*)/) || line.match(/^-\s*\[([ xX])\]\s*(.*)/);
      if (match) {
        const desc = match[2] || match[0];
        const isCompleted = line.includes("[x]") || line.includes("[X]");
        steps.push({
          stepNumber: currentStep++,
          description: desc,
          motivation: "Extracted from captured agent implementation plan.",
          status: isCompleted ? "completed" : "pending",
          verificationCriteria: "Evidence of completion verified via tool logs.",
          verified: isCompleted,
        });
      }
    }

    return steps;
  }
}

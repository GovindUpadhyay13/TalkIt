/**
 * Types and interfaces for TalkIt Developer Mode: Background Development Companion.
 */

export type DevSessionSourceType = "antigravity" | "approval_server" | "custom_log";

export type DevSessionEventType =
  | "user_prompt"
  | "agent_response"
  | "tool_invocation"
  | "command_started"
  | "command_completed"
  | "command_failed"
  | "test_result"
  | "file_change"
  | "permission_requested"
  | "permission_resolved"
  | "agent_status_changed"
  | "session_ended";

export interface DevSessionEvent {
  id: string;
  sessionId: string;
  timestamp: string | number;
  source: DevSessionSourceType;
  type: DevSessionEventType;
  content: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  status: "complete" | "partial" | "unavailable";
  confidence: number;
  verified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DevTestSummary {
  command: string;
  passed: boolean;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  timestamp: string | number;
  verified?: boolean;
}

export interface DevFileModification {
  path: string;
  action: "create" | "modify" | "delete";
  timestamp: string | number;
  verified: boolean;
  stepIndex?: number;
}

export interface DevCommandRecord {
  id: string;
  command: string;
  cwd?: string;
  startedAt: string | number;
  completedAt?: string | number;
  exitCode?: number;
  outputSnippet?: string;
  errorSnippet?: string;
  status: "running" | "completed" | "failed" | "unconfirmed";
  verified: boolean;
}

export interface DevApprovalRecord {
  id?: string;
  requestId?: string;
  source?: string;
  toolName?: string;
  action: string;
  detail?: string;
  target?: string;
  timestamp?: string | number;
  requestedAt?: string | number;
  resolvedAt?: string | number;
  status: "pending" | "resolved" | "expired";
  decision?: "allow_once" | "always" | "deny" | "cancel";
}

export interface DevCatchMeUpSummary {
  sessionId: string;
  timestamp: string;
  source: DevSessionSourceType;
  monitoringActive: boolean;
  hasOriginalPrompt: boolean;
  originalPrompt?: string;
  summary: string;
  reportedCompleted: string[];
  reportedWork: string[];
  verifiedCompleted: string[];
  verifiedWork: string[];
  workInProgress: string[];
  failedCommands: DevCommandRecord[];
  failedTests: DevTestSummary[];
  failedItems: string[];
  recentFileChanges: DevFileModification[];
  pendingApprovals: DevApprovalRecord[];
  remainingTasks: string[];
  gapsAcknowledged: string[];
  gaps: string[];
  hasGaps: boolean;
  confidenceScore: number;
}

export interface DevImplementationPlanStep {
  stepNumber: number;
  description: string;
  motivation: string;
  status: "completed" | "in_progress" | "pending" | "blocked";
  dependencies?: string[];
  verificationCriteria: string;
  uncertainties?: string[];
  verified: boolean;
  evidence?: string;
}

export interface DevImplementationPlanSummary {
  sessionId: string;
  timestamp: string;
  isExistingPlan: boolean;
  isProposed: boolean;
  source: string;
  planSource: "captured_agent_plan" | "newly_generated_proposal";
  title: string;
  steps: DevImplementationPlanStep[];
  clarificationNeeded?: string | null;
  missingInformationWarning?: string;
}

export interface DevModeState {
  enabled: boolean;
  monitoring: boolean;
  source: DevSessionSourceType;
  connectionStatus: "connected" | "connecting" | "disconnected";
  sessionId?: string;
  activeSessionId?: string | null;
  sessionPath?: string;
  workspacePath?: string;
  activeWorkspace?: string | null;
  connected: boolean;
  lastEventTimestamp?: string | null;
  eventCount: number;
  hasGaps: boolean;
  gapReason?: string;
  activePendingApprovalsCount: number;
  latestSummary?: DevCatchMeUpSummary;
}

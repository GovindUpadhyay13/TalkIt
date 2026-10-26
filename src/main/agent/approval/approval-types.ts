export type CodingAgentDecision = "allow_once" | "always" | "deny" | "never" | "cancel";

export interface ExternalPermissionRequest {
  id: string;
  source: string; // e.g. "Claude Code", "Cursor", "Coding Agent"
  action: string; // e.g. "Run Bash Command", "Modify File", "Network Request"
  detail: string; // e.g. "pip install requests", "rm -rf temp/"
  spokenExplanation?: string;
  timestamp: number;
  status: "pending" | "resolved" | "expired";
  decision?: CodingAgentDecision;
}

export interface ApprovalServerConfig {
  port: number;
  host: string;
  timeoutMs: number;
}

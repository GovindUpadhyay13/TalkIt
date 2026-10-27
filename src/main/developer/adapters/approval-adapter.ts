import {
  getActivePendingRequests,
  onApprovalEvent,
  type ApprovalServerEvent,
} from "../../agent/approval/approval-server";
import type { SessionCollector } from "../collector";
import type { DevSessionEvent } from "../types";

export class ApprovalServerAdapter implements SessionCollector {
  public readonly id = "approval_server";
  public readonly name = "TalkIt Coding Agent Approval Server";

  private unsubscribe?: () => void;
  private running = false;
  private onEvent?: (event: DevSessionEvent) => void;

  public async isAvailable(): Promise<boolean> {
    return true; // Built-in loopback server
  }

  public async start(onEvent: (event: DevSessionEvent) => void): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.onEvent = onEvent;

    // Load any currently active pending requests right away
    const currentPending = getActivePendingRequests();
    for (const req of currentPending) {
      this.onEvent({
        id: `approval-${req.id}-requested`,
        sessionId: "external-coding-agent",
        timestamp: new Date(req.timestamp).toISOString(),
        source: "approval_server",
        type: "permission_requested",
        content: req.detail,
        payload: {
          requestId: req.id,
          source: req.source,
          action: req.action,
          detail: req.detail,
        },
        status: "complete",
        confidence: 1.0,
        verified: true,
      });
    }

    // Subscribe to live approval events
    this.unsubscribe = onApprovalEvent((event: ApprovalServerEvent) => {
      if (!this.running || !this.onEvent) return;

      const timestamp = new Date(event.request.timestamp).toISOString();

      if (event.type === "requested") {
        this.onEvent({
          id: `approval-${event.request.id}-requested`,
          sessionId: "external-coding-agent",
          timestamp,
          source: "approval_server",
          type: "permission_requested",
          content: event.request.detail,
          payload: {
            requestId: event.request.id,
            source: event.request.source,
            action: event.request.action,
            detail: event.request.detail,
          },
          status: "complete",
          confidence: 1.0,
          verified: true,
        });
      } else if (event.type === "resolved") {
        this.onEvent({
          id: `approval-${event.request.id}-resolved`,
          sessionId: "external-coding-agent",
          timestamp: new Date().toISOString(),
          source: "approval_server",
          type: "permission_resolved",
          content: `Permission ${event.decision} for ${event.request.action}`,
          payload: {
            requestId: event.request.id,
            decision: event.decision,
          },
          status: "complete",
          confidence: 1.0,
          verified: true,
        });
      }
    });
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

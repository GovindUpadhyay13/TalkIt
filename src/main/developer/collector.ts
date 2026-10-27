import type { DevSessionEvent } from "./types";

/**
 * Common interface for development environment session collectors.
 * Allows TalkIt Developer Mode to accept session telemetry from
 * multiple coding environments (Antigravity, coding-agent hooks, etc.)
 */
export interface SessionCollector {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  start(onEvent: (event: DevSessionEvent) => void, onGap?: (gap: string) => void): Promise<void>;
  stop(): Promise<void>;
  getCurrentSessionId?(): string | undefined;
  getWorkspacePath?(): string | undefined;
}

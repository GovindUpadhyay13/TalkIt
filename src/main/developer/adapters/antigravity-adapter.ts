import { createReadStream, promises as fs, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import type { SessionCollector } from "../collector";
import type { DevSessionEvent } from "../types";

export interface AntigravityAdapterOptions {
  brainDir?: string;
  targetSessionId?: string;
}

export class AntigravitySessionAdapter implements SessionCollector {
  public readonly id = "antigravity";
  public readonly name = "Antigravity IDE";

  private brainDir: string;
  private targetSessionId?: string;
  private currentSessionId?: string;
  private transcriptPath?: string;
  private fileWatcher?: FSWatcher;
  private pollTimer?: NodeJS.Timeout;
  private lastReadOffset = 0;
  private pendingLineBuffer = "";
  private running = false;
  private onEvent?: (event: DevSessionEvent) => void;
  private onGap?: (gap: string) => void;

  // Correlation tracker: step_index -> command/tool
  private activeStepCommands = new Map<number, { command: string; eventId: string }>();

  constructor(options?: AntigravityAdapterOptions) {
    this.brainDir = options?.brainDir || this.resolveDefaultBrainDir();
    this.targetSessionId = options?.targetSessionId;
  }

  private resolveDefaultBrainDir(): string {
    const home = process.env.USERPROFILE || process.env.HOME || "";
    return join(home, ".gemini", "antigravity-ide", "brain");
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.brainDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  public getCurrentSessionId(): string | undefined {
    return this.currentSessionId || this.targetSessionId;
  }

  public async start(
    onEvent: (event: DevSessionEvent) => void,
    onGap?: (gap: string) => void,
  ): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.onEvent = onEvent;
    this.onGap = onGap;

    try {
      // 1. Resolve target session directory
      const sessionId = await this.resolveActiveSessionId();
      if (!sessionId) {
        this.onGap?.("No active Antigravity session could be discovered in " + this.brainDir);
        return;
      }
      this.currentSessionId = sessionId;
      this.transcriptPath = join(
        this.brainDir,
        sessionId,
        ".system_generated",
        "logs",
        "transcript.jsonl",
      );

      // Verify transcript file existence
      try {
        await fs.access(this.transcriptPath);
      } catch {
        this.onGap?.(
          `Antigravity session "${sessionId}" has no transcript.jsonl log file yet.`,
        );
        return;
      }

      // 2. Perform initial read from beginning of file
      this.lastReadOffset = 0;
      this.pendingLineBuffer = "";
      await this.readIncrementalLines();

      // 3. Attach file watcher for real-time live streaming
      try {
        this.fileWatcher = watch(this.transcriptPath, () => {
          void this.readIncrementalLines();
        });
        (this.fileWatcher as any)?.unref?.();
      } catch (err) {
        console.warn("[TalkIt DevMode] fs.watch not supported on this platform/path, using polling fallback", err);
      }

      // 4. Attach fallback interval polling to catch any coalesced Windows file events
      this.pollTimer = setInterval(() => {
        void this.readIncrementalLines();
      }, 1000);
      this.pollTimer.unref();
    } catch (err) {
      this.onGap?.(`Antigravity session adapter failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.activeStepCommands.clear();
    this.pendingLineBuffer = "";
  }

  private async resolveActiveSessionId(): Promise<string | null> {
    if (this.targetSessionId) {
      return this.targetSessionId;
    }

    try {
      const entries = await fs.readdir(this.brainDir, { withFileTypes: true });
      const sessionDirs = entries.filter(
        (e) => e.isDirectory() && e.name !== "tempmediaStorage",
      );

      if (sessionDirs.length === 0) return null;

      // Find the most recently modified session directory
      let mostRecentSession: string | null = null;
      let newestMtime = 0;

      for (const dir of sessionDirs) {
        try {
          const logFile = join(
            this.brainDir,
            dir.name,
            ".system_generated",
            "logs",
            "transcript.jsonl",
          );
          const stat = await fs.stat(logFile);
          if (stat.mtimeMs > newestMtime) {
            newestMtime = stat.mtimeMs;
            mostRecentSession = dir.name;
          }
        } catch {
          // Ignore dirs without logs
        }
      }

      return mostRecentSession || (sessionDirs[0]?.name ?? null);
    } catch {
      return null;
    }
  }

  /**
   * Reads newly appended bytes from transcript.jsonl and processes complete lines.
   */
  private async readIncrementalLines(): Promise<void> {
    if (!this.running || !this.transcriptPath) return;

    try {
      const stat = await fs.stat(this.transcriptPath);
      if (stat.size <= this.lastReadOffset) {
        return; // No new data
      }

      const stream = createReadStream(this.transcriptPath, {
        start: this.lastReadOffset,
        end: stat.size,
        encoding: "utf8",
      });

      let chunk = "";
      for await (const data of stream) {
        chunk += data;
      }

      this.lastReadOffset = stat.size;

      const combined = this.pendingLineBuffer + chunk;
      const lines = combined.split("\n");

      // Last item may be incomplete line if write was in-flight
      this.pendingLineBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.parseTranscriptLine(trimmed);
        }
      }
    } catch (err) {
      this.onGap?.(`Error reading transcript stream: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Parses an individual line from transcript.jsonl into typed DevSessionEvents.
   */
  public parseTranscriptLine(lineJson: string): void {
    try {
      const entry = JSON.parse(lineJson);
      const stepIndex = typeof entry.step_index === "number" ? entry.step_index : 0;
      const timestamp = entry.created_at || new Date().toISOString();
      const sessionId = this.currentSessionId || "unknown";

      // 1. User Prompt (USER_INPUT)
      if (entry.type === "USER_INPUT") {
        const rawContent = String(entry.content || "");
        const userPrompt = this.extractUserPrompt(rawContent);
        if (userPrompt) {
          this.onEvent?.({
            id: `antigravity-step-${stepIndex}-prompt`,
            sessionId,
            timestamp,
            source: "antigravity",
            type: "user_prompt",
            content: userPrompt,
            status: "complete",
            confidence: 1.0,
            verified: true,
          });
        }
        return;
      }

      // 2. Planner Response (PLANNER_RESPONSE)
      if (entry.type === "PLANNER_RESPONSE") {
        // Text reply or explanation from the agent
        if (entry.content && typeof entry.content === "string" && entry.content.trim()) {
          this.onEvent?.({
            id: `antigravity-step-${stepIndex}-response`,
            sessionId,
            timestamp,
            source: "antigravity",
            type: "agent_response",
            content: entry.content.trim(),
            status: "complete",
            confidence: 0.9,
            verified: false, // Agent reported claims are not independently verified!
          });
        }

        // Tool calls in planner response
        if (Array.isArray(entry.tool_calls)) {
          for (const tc of entry.tool_calls) {
            const toolName = tc.name;
            const args = tc.args || {};

            // Record tool invocation
            this.onEvent?.({
              id: `antigravity-step-${stepIndex}-tool-${toolName}`,
              sessionId,
              timestamp,
              source: "antigravity",
              type: "tool_invocation",
              content: `Tool invocation: ${toolName}`,
              payload: { toolName, args },
              status: "complete",
              confidence: 1.0,
              verified: true,
            });

            // If tool is run_command, emit command_started
            if (toolName === "run_command" && args.CommandLine) {
              const cmdStr = this.stripQuotes(String(args.CommandLine));
              const eventId = `antigravity-step-${stepIndex}-cmd`;
              this.activeStepCommands.set(stepIndex, { command: cmdStr, eventId });

              this.onEvent?.({
                id: eventId,
                sessionId,
                timestamp,
                source: "antigravity",
                type: "command_started",
                content: cmdStr,
                payload: {
                  command: cmdStr,
                  cwd: args.Cwd ? this.stripQuotes(String(args.Cwd)) : undefined,
                  stepIndex,
                },
                status: "complete",
                confidence: 1.0,
                verified: true,
              });
            }

            // If tool is file modification, emit file_change
            if (
              toolName === "write_to_file" ||
              toolName === "replace_file_content" ||
              toolName === "multi_replace_file_content"
            ) {
              const targetFile = args.TargetFile ? this.stripQuotes(String(args.TargetFile)) : undefined;
              if (targetFile) {
                this.onEvent?.({
                  id: `antigravity-step-${stepIndex}-file-${targetFile}`,
                  sessionId,
                  timestamp,
                  source: "antigravity",
                  type: "file_change",
                  content: targetFile,
                  payload: {
                    path: targetFile,
                    action: toolName === "write_to_file" ? "create" : "modify",
                    stepIndex,
                  },
                  status: "complete",
                  confidence: 1.0,
                  verified: true,
                });
              }
            }
          }
        }
        return;
      }

      // 3. Command Execution & Test Results (from command step responses)
      if (entry.type === "RUN_COMMAND" || (entry.content && String(entry.content).includes("The command exited with code"))) {
        const contentStr = String(entry.content || "");
        const exitCodeMatch = contentStr.match(/The command exited with code (\d+)/);
        const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0;
        const passed = exitCode === 0;

        // Correlate with active command if available
        const correlated = this.activeStepCommands.get(stepIndex - 1);
        const correlationId = correlated?.eventId;
        const commandStr = correlated?.command || "command";

        // Emit command completion event
        this.onEvent?.({
          id: `antigravity-step-${stepIndex}-cmd-res`,
          sessionId,
          timestamp,
          source: "antigravity",
          type: passed ? "command_completed" : "command_failed",
          content: contentStr,
          correlationId,
          payload: { command: commandStr, exitCode },
          status: "complete",
          confidence: 1.0,
          verified: true,
        });

        // Check if this was a test run (e.g. pnpm test, npm test, tsx --test)
        if (
          commandStr.includes("test") ||
          contentStr.includes("ℹ pass") ||
          contentStr.includes("tests ")
        ) {
          const passMatch = contentStr.match(/(?:pass|passed)\s+(\d+)/i);
          const failMatch = contentStr.match(/(?:fail|failed)\s+(\d+)/i);
          const totalMatch = contentStr.match(/tests\s+(\d+)/i);

          const passedTests = passMatch ? parseInt(passMatch[1], 10) : undefined;
          const failedTests = failMatch ? parseInt(failMatch[1], 10) : undefined;
          const totalTests = totalMatch ? parseInt(totalMatch[1], 10) : undefined;

          this.onEvent?.({
            id: `antigravity-step-${stepIndex}-test-res`,
            sessionId,
            timestamp,
            source: "antigravity",
            type: "test_result",
            content: `Test execution: ${passed ? "PASSED" : "FAILED"}`,
            correlationId,
            payload: {
              command: commandStr,
              passed: passed && (failedTests === undefined || failedTests === 0),
              passedTests,
              failedTests,
              totalTests,
            },
            status: "complete",
            confidence: 1.0,
            verified: true,
          });
        }
      }
    } catch {
      // Ignore unparseable lines
    }
  }

  private extractUserPrompt(raw: string): string | null {
    const match = raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    const cleaned = raw.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, "").trim();
    return cleaned || null;
  }

  private stripQuotes(val: string): string {
    return val.replace(/^["']+|["']+$/g, "").replace(/\\\\/g, "\\");
  }
}

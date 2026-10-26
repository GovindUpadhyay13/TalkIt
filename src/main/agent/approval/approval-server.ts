import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type {
  ApprovalServerConfig,
  CodingAgentDecision,
  ExternalPermissionRequest,
} from "./approval-types";

export interface PendingExternalRequest {
  request: ExternalPermissionRequest;
  resolve: (decision: CodingAgentDecision) => void;
  timer: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingExternalRequest>();
const auditLog: Array<{
  id: string;
  source: string;
  action: string;
  decision: CodingAgentDecision;
  timestamp: number;
}> = [];

let serverInstance: Server | null = null;
let currentNotifier: ((req: ExternalPermissionRequest) => void) | null = null;

export function setApprovalNotifier(notifier: (req: ExternalPermissionRequest) => void) {
  currentNotifier = notifier;
}

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error("Request payload too large"));
      }
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error("Malformed JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(json);
}

export function startApprovalServer(config: ApprovalServerConfig = { port: 51111, host: "127.0.0.1", timeoutMs: 120_000 }): Promise<Server> {
  return new Promise((resolve, reject) => {
    if (serverInstance) {
      return resolve(serverInstance);
    }

    const server = createServer(async (req, res) => {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        });
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

      // Health probe
      if (req.method === "GET" && url.pathname === "/v1/health") {
        return sendJson(res, 200, {
          ok: true,
          service: "talkit-approval-server",
          pendingCount: pendingRequests.size,
        });
      }

      // Pending requests query
      if (req.method === "GET" && url.pathname === "/v1/permissions/pending") {
        const pending = Array.from(pendingRequests.values()).map((p) => p.request);
        return sendJson(res, 200, { ok: true, pending });
      }

      // Audit log query
      if (req.method === "GET" && url.pathname === "/v1/permissions/audit") {
        return sendJson(res, 200, { ok: true, audit: auditLog.slice(-50) });
      }

      // Request approval from external coding agent
      if (req.method === "POST" && url.pathname === "/v1/permissions/request") {
        try {
          const body = await parseJsonBody(req);
          const action = String(body.action || "Execute operation");
          const detail = String(body.detail || body.command || "External action requested");
          const source = String(body.source || body.agent || "Coding Agent");
          const id = (body.id && typeof body.id === "string" ? body.id : randomUUID());

          if (pendingRequests.has(id)) {
            return sendJson(res, 409, { error: "A request with this ID is already pending." });
          }

          const spokenExplanation =
            body.spokenExplanation && typeof body.spokenExplanation === "string"
              ? body.spokenExplanation
              : `Your ${source} wants to ${action.toLowerCase()}. Details: ${detail}. Allow this request?`;

          const requestItem: ExternalPermissionRequest = {
            id,
            source,
            action,
            detail,
            spokenExplanation,
            timestamp: Date.now(),
            status: "pending",
          };

          const decisionPromise = new Promise<CodingAgentDecision>((resolveDecision) => {
            const timer = setTimeout(() => {
              pendingRequests.delete(id);
              requestItem.status = "expired";
              requestItem.decision = "deny";
              auditLog.push({ id, source, action, decision: "deny", timestamp: Date.now() });
              resolveDecision("deny");
            }, config.timeoutMs);

            pendingRequests.set(id, {
              request: requestItem,
              resolve: (dec) => {
                clearTimeout(timer);
                pendingRequests.delete(id);
                requestItem.status = "resolved";
                requestItem.decision = dec;
                auditLog.push({ id, source, action, decision: dec, timestamp: Date.now() });
                resolveDecision(dec);
              },
              timer,
            });
          });

          // Notify the UI and audio output
          if (currentNotifier) {
            currentNotifier(requestItem);
          }

          const decision = await decisionPromise;
          const allowed = decision === "allow_once" || decision === "always";

          return sendJson(res, 200, {
            id,
            decision,
            allowed,
            message: allowed ? "Permission granted by user" : "Permission denied by user",
          });
        } catch (err) {
          return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // Manual decision resolution endpoint
      if (req.method === "POST" && url.pathname.startsWith("/v1/permissions/") && url.pathname.endsWith("/decision")) {
        const parts = url.pathname.split("/");
        const id = parts[3];
        try {
          const body = await parseJsonBody(req);
          const decision = body.decision as CodingAgentDecision;
          const resolved = resolveExternalRequest(id, decision);
          if (resolved) {
            return sendJson(res, 200, { ok: true, id, decision });
          } else {
            return sendJson(res, 404, { error: "Pending request not found or already settled." });
          }
        } catch (err) {
          return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
        }
      }

      return sendJson(res, 404, { error: "Endpoint not found" });
    });

    server.on("error", (err) => {
      console.error("[talkit approval server] error:", err);
      reject(err);
    });

    server.listen(config.port, config.host, () => {
      console.log(`[talkit approval server] listening on http://${config.host}:${config.port}`);
      serverInstance = server;
      resolve(server);
    });
  });
}

export function resolveExternalRequest(id: string, decision: CodingAgentDecision): boolean {
  const pending = pendingRequests.get(id);
  if (!pending) return false;
  pending.resolve(decision);
  return true;
}

export function stopApprovalServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverInstance) return resolve();
    serverInstance.close(() => {
      serverInstance = null;
      resolve();
    });
  });
}

#!/usr/bin/env node
/**
 * Talkit External Approval Hook
 *
 * Use this script to integrate CLI coding agents (Claude Code, Cursor, Copilot, custom scripts)
 * with Talkit voice approvals.
 *
 * Usage:
 *   node scripts/talkit-approval-hook.js "<action>" "<details>" "[source]"
 *
 * Example:
 *   node scripts/talkit-approval-hook.js "Run Command" "npm install requests" "Claude Code"
 */

const http = require("node:http");

const action = process.argv[2] || "Execute command";
const detail = process.argv[3] || process.argv.slice(2).join(" ") || "External action";
const source = process.argv[4] || "Coding Agent";

const payload = JSON.stringify({
  action,
  detail,
  source,
});

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: 51111,
    path: "/v1/permissions/request",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(body);
        if (json.allowed) {
          console.log(`[Talkit] Decision: ALLOWED (${json.decision})`);
          process.exit(0);
        } else {
          console.error(`[Talkit] Decision: DENIED (${json.decision})`);
          process.exit(1);
        }
      } catch {
        console.error("[Talkit] Malformed approval response:", body);
        process.exit(1);
      }
    });
  },
);

req.on("error", (err) => {
  console.error(`[Talkit] Could not reach Talkit Approval Server (http://127.0.0.1:51111): ${err.message}`);
  console.error("[Talkit] Ensure Talkit is running on your desktop.");
  process.exit(1);
});

req.write(payload);
req.end();

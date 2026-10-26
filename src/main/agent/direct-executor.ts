import { spawn } from "node:child_process";
import { shell } from "electron";

const WINDOWS_APP_ALIASES: Record<string, { cmd: string; name: string }> = {
  calculator: { cmd: "calc", name: "Calculator" },
  calc: { cmd: "calc", name: "Calculator" },
  notepad: { cmd: "notepad", name: "Notepad" },
  chrome: { cmd: "chrome", name: "Google Chrome" },
  "google chrome": { cmd: "chrome", name: "Google Chrome" },
  edge: { cmd: "msedge", name: "Microsoft Edge" },
  msedge: { cmd: "msedge", name: "Microsoft Edge" },
  "microsoft edge": { cmd: "msedge", name: "Microsoft Edge" },
  explorer: { cmd: "explorer", name: "File Explorer" },
  "file explorer": { cmd: "explorer", name: "File Explorer" },
  files: { cmd: "explorer", name: "File Explorer" },
  "my computer": { cmd: "explorer", name: "File Explorer" },
  terminal: { cmd: "wt", name: "Windows Terminal" },
  "windows terminal": { cmd: "wt", name: "Windows Terminal" },
  powershell: { cmd: "powershell", name: "PowerShell" },
  cmd: { cmd: "cmd", name: "Command Prompt" },
  "command prompt": { cmd: "cmd", name: "Command Prompt" },
  settings: { cmd: "ms-settings:", name: "Windows Settings" },
  "windows settings": { cmd: "ms-settings:", name: "Windows Settings" },
  spotify: { cmd: "spotify:", name: "Spotify" },
  "task manager": { cmd: "taskmgr", name: "Task Manager" },
  taskmgr: { cmd: "taskmgr", name: "Task Manager" },
  paint: { cmd: "mspaint", name: "Paint" },
  mspaint: { cmd: "mspaint", name: "Paint" },
  code: { cmd: "code", name: "Visual Studio Code" },
  vscode: { cmd: "code", name: "Visual Studio Code" },
  "vs code": { cmd: "code", name: "Visual Studio Code" },
  word: { cmd: "winword", name: "Microsoft Word" },
  "microsoft word": { cmd: "winword", name: "Microsoft Word" },
  excel: { cmd: "excel", name: "Microsoft Excel" },
  "microsoft excel": { cmd: "excel", name: "Microsoft Excel" },
};

export interface DirectExecutionResult {
  matched: boolean;
  ok?: boolean;
  reply?: string;
  action?: string;
  error?: string;
}

/**
 * Spawns an application by executable or alias name in a detached process.
 */
export function launchDesktopApp(appNameOrAlias: string): Promise<{ ok: boolean; name: string; error?: string }> {
  return new Promise((resolve) => {
    const lower = appNameOrAlias.trim().toLowerCase();
    const aliasInfo = WINDOWS_APP_ALIASES[lower];
    const targetCmd = aliasInfo ? aliasInfo.cmd : appNameOrAlias.trim();
    const friendlyName = aliasInfo ? aliasInfo.name : appNameOrAlias.trim();

    let cmd: string;
    let args: string[];

    if (process.platform === "win32") {
      cmd = "cmd";
      args = ["/c", "start", "", targetCmd];
    } else if (process.platform === "darwin") {
      cmd = "open";
      args = ["-a", targetCmd];
    } else {
      cmd = "gtk-launch";
      args = [targetCmd];
    }

    try {
      const child = spawn(cmd, args, { stdio: "ignore", detached: true });
      child.on("error", (err) => {
        resolve({ ok: false, name: friendlyName, error: err.message });
      });
      child.unref();
      // Optimistically resolve after short delay
      setTimeout(() => {
        resolve({ ok: true, name: friendlyName });
      }, 80);
    } catch (err) {
      resolve({
        ok: false,
        name: friendlyName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

/**
 * Attempts to parse and directly execute system/desktop commands without needing an LLM round-trip.
 */
export async function executeDirectCommand(rawInput: string): Promise<DirectExecutionResult> {
  const cleaned = rawInput.trim().replace(/^[,.:;!?]+|[,.:;!?]+$/g, "").trim();
  const lower = cleaned.toLowerCase();

  // 1. Standalone app launch keywords (e.g. "calculator", "notepad", "chrome", "terminal")
  if (WINDOWS_APP_ALIASES[lower]) {
    const res = await launchDesktopApp(lower);
    if (res.ok) {
      return {
        matched: true,
        ok: true,
        action: "open_app",
        reply: `Opened ${res.name}.`,
      };
    }
  }

  // 2. "open [app]" or "launch [app]" or "start [app]" or "run [app]"
  const openAppMatch = lower.match(/^(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9._ -]+)$/i);
  if (openAppMatch) {
    const target = openAppMatch[1].trim();

    // Check if target is a web URL or domain (e.g. youtube.com, google.com, http...)
    if (/^(?:https?:\/\/|[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$)/i.test(target)) {
      const url = target.startsWith("http://") || target.startsWith("https://") ? target : `https://${target}`;
      try {
        if (shell && typeof shell.openExternal === "function") {
          await shell.openExternal(url);
        }
        return {
          matched: true,
          ok: true,
          action: "open_url",
          reply: `Opened ${url}.`,
        };
      } catch (err) {
        return {
          matched: true,
          ok: false,
          action: "open_url",
          error: err instanceof Error ? err.message : String(err),
          reply: `Failed to open ${url}.`,
        };
      }
    }

    // Launch application
    const res = await launchDesktopApp(target);
    if (res.ok) {
      return {
        matched: true,
        ok: true,
        action: "open_app",
        reply: `Opened ${res.name}.`,
      };
    }
  }

  // 3. Web search: "search [for] <query>"
  const searchMatch = lower.match(/^(?:search(?:\s+google)?(?:\s+for)?|google)\s+(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    try {
      if (shell && typeof shell.openExternal === "function") {
        await shell.openExternal(searchUrl);
      }
    } catch {
      // ignore
    }
    return {
      matched: true,
      ok: true,
      action: "web_search",
      reply: `Searching Google for "${query}".`,
    };
  }

  // 4. Quick Time/Date queries
  if (/^(?:what\s+time\s+is\s+it|what'?s\s+the\s+time|current\s+time|time)$/i.test(lower)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return {
      matched: true,
      ok: true,
      action: "get_time",
      reply: `The current time is ${timeStr}.`,
    };
  }

  if (/^(?:what\s+date\s+is\s+it|what'?s\s+the\s+date|what\s+day\s+is\s+today|today'?s\s+date|date)$/i.test(lower)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return {
      matched: true,
      ok: true,
      action: "get_date",
      reply: `Today is ${dateStr}.`,
    };
  }

  return { matched: false };
}

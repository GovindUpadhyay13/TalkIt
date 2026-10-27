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

export function isDirectAppCommand(rawInput: string): boolean {
  const cleaned = rawInput.trim().replace(/^[,.:;!?]+|[,.:;!?]+$/g, "").trim().toLowerCase();
  if (WINDOWS_APP_ALIASES[cleaned]) return true;
  const openAppMatch = cleaned.match(/^(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9._ -]+)$/i);
  if (!openAppMatch) return false;
  const target = openAppMatch[1].trim();
  return Boolean(WINDOWS_APP_ALIASES[target]);
}

/**
 * Reliably opens a URL in the user's default browser (via Electron shell or native OS start).
 */
export async function openUrlInBrowser(url: string): Promise<{ ok: boolean; error?: string }> {
  let opened = false;
  try {
    if (shell && typeof shell.openExternal === "function") {
      await shell.openExternal(url);
      opened = true;
    }
  } catch {
    // shell failed, fall back to native command
  }

  if (!opened) {
    if (process.platform === "win32") {
      try {
        spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
        opened = true;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    } else if (process.platform === "darwin") {
      try {
        spawn("open", [url], { stdio: "ignore", detached: true }).unref();
        opened = true;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    } else {
      try {
        spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
        opened = true;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  return { ok: opened };
}

function cleanSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/^(?:for|about|on\s+google|in\s+google)\s+/i, "")
    .replace(/\s+(?:on\s+google|in\s+google)$/i, "")
    .replace(/^[,.:;!?"']+|[,.:;!?"']+$/g, "")
    .trim();
}

/**
 * Extracts the user's intended Google search query from an utterance.
 * Returns "" if the user wants to open the Google homepage.
 * Returns null if the utterance is not a search request.
 */
export function extractGoogleSearchQuery(rawInput: string): string | null {
  const cleaned = rawInput.trim().replace(/^[,.:;!?"']+|[,.:;!?"']+$/g, "").trim();
  if (!cleaned) return null;

  // Explicit Google opening without search query:
  // "open google", "launch google", "start google", "go to google", "google.com", "google"
  if (
    /^(?:open|launch|start|go\s+to)\s+google(?:\.com)?$/i.test(cleaned) ||
    /^(?:https?:\/\/)?(?:www\.)?google\.com(?:\/)?$/i.test(cleaned) ||
    /^google$/i.test(cleaned)
  ) {
    return ""; // signifies opening Google home page
  }

  // 1. "open google and search [for] <query>", "open google to search <query>"
  const openAndSearch = cleaned.match(
    /^(?:open\s+google\s+(?:and|to)\s+(?:search|look\s*up)(?:\s+(?:for|on\s+google))?)\s+(.+)$/i,
  );
  if (openAndSearch) return cleanSearchQuery(openAndSearch[1]);

  // 2. "do a google search for <query>", "perform a google search for <query>", "run a google search for <query>"
  const doSearch = cleaned.match(
    /^(?:do|perform|run)\s+(?:a\s+)?(?:google\s+)?search(?:\s+(?:for|on\s+google))?\s+(.+)$/i,
  );
  if (doSearch) return cleanSearchQuery(doSearch[1]);

  // 3. "search on google for <query>", "search on google <query>"
  const searchOnGoogle = cleaned.match(/^search\s+on\s+google(?:\s+for)?\s+(.+)$/i);
  if (searchOnGoogle) return cleanSearchQuery(searchOnGoogle[1]);

  // 4. "search google for <query>", "search google <query>"
  const searchGoogle = cleaned.match(/^search\s+google(?:\s+for)?\s+(.+)$/i);
  if (searchGoogle) return cleanSearchQuery(searchGoogle[1]);

  // 5. "google search for <query>", "google search <query>"
  const googleSearch = cleaned.match(/^google\s+search(?:\s+for)?\s+(.+)$/i);
  if (googleSearch) return cleanSearchQuery(googleSearch[1]);

  // 6. "search for <query> on google", "search <query> on google"
  const searchTrailingGoogle = cleaned.match(/^search(?:\s+for)?\s+(.+?)\s+on\s+google$/i);
  if (searchTrailingGoogle) return cleanSearchQuery(searchTrailingGoogle[1]);

  // 7. "look up <query> on google", "look up <query>", "find <query> on google", "find <query> on the web"
  const lookUp = cleaned.match(
    /^(?:look\s+up|find)(?:\s+for)?\s+(.+?)(?:\s+(?:on\s+google|on\s+(?:the\s+)?web))?$/i,
  );
  if (lookUp && lookUp[1].trim()) {
    const q = cleanSearchQuery(lookUp[1]);
    if (q) return q;
  }

  // 8. "google for <query>", "google it <query>", "google <query>"
  // (Exclude single words like "google chrome", "google drive", or "google" alone)
  const googleDirect = cleaned.match(/^google(?:\s+(?:for|it|about|this))?\s+(.+)$/i);
  if (googleDirect) {
    const q = cleanSearchQuery(googleDirect[1]);
    const lowerQ = q.toLowerCase();
    if (
      lowerQ &&
      lowerQ !== "chrome" &&
      lowerQ !== "drive" &&
      lowerQ !== "docs" &&
      lowerQ !== "sheets"
    ) {
      return q;
    }
  }

  // 9. "search for <query>", "search the web for <query>", "search web for <query>"
  const searchWeb = cleaned.match(/^search(?:\s+(?:the\s+)?web)?\s+for\s+(.+)$/i);
  if (searchWeb) return cleanSearchQuery(searchWeb[1]);

  // 10. "search <query>" (e.g. "search elon musk net worth", "search how to center a div")
  const searchGeneric = cleaned.match(/^search\s+(.+)$/i);
  if (searchGeneric) {
    const q = cleanSearchQuery(searchGeneric[1]);
    const lowerQ = q.toLowerCase();
    if (lowerQ && !["google", "web", "the web", "online", "for"].includes(lowerQ)) {
      return q;
    }
  }

  return null;
}

/**
 * Attempts to parse and directly execute system/desktop commands without needing an LLM round-trip.
 */
export async function executeDirectCommand(rawInput: string): Promise<DirectExecutionResult> {
  const cleaned = rawInput.trim().replace(/^[,.:;!?]+|[,.:;!?]+$/g, "").trim();
  const lower = cleaned.toLowerCase();

  // 1. Google Search or Google Homepage opening (matched FIRST to prevent misrouting to apps)
  const searchQuery = extractGoogleSearchQuery(cleaned);
  if (searchQuery !== null) {
    if (searchQuery === "") {
      // Open Google homepage
      const googleUrl = "https://www.google.com";
      const res = await openUrlInBrowser(googleUrl);
      return {
        matched: true,
        ok: res.ok,
        action: "open_url",
        reply: "Opened Google.",
      };
    }

    // Execute Google search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    const res = await openUrlInBrowser(searchUrl);
    return {
      matched: true,
      ok: res.ok,
      action: "web_search",
      reply: `Searching Google for "${searchQuery}".`,
    };
  }

  // 2. Standalone app launch keywords (e.g. "calculator", "notepad", "chrome", "terminal")
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

  // 3. "open [app]" or "launch [app]" or "start [app]" or "run [app]"
  const openAppMatch = lower.match(/^(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9._ -]+)$/i);
  if (openAppMatch) {
    const target = openAppMatch[1].trim();

    // Check if target is a web URL or domain (e.g. youtube.com, github.com, http...)
    if (/^(?:https?:\/\/|[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$)/i.test(target)) {
      const url = target.startsWith("http://") || target.startsWith("https://") ? target : `https://${target}`;
      const res = await openUrlInBrowser(url);
      return {
        matched: true,
        ok: res.ok,
        action: "open_url",
        reply: res.ok ? `Opened ${url}.` : `Failed to open ${url}.`,
        error: res.error,
      };
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

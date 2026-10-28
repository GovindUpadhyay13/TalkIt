import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DevGitPushResult } from "./types";

const execAsync = promisify(exec);

/**
 * Runs a git command in the target directory with error trapping.
 */
async function runGit(cmd: string, cwd: string): Promise<string> {
  const { stdout, stderr } = await execAsync(cmd, {
    cwd,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (stderr && !stdout && stderr.toLowerCase().includes("fatal:")) {
    throw new Error(stderr.trim());
  }
  return stdout.trim();
}

/**
 * Resolves the git repository root for the current workspace.
 */
function resolveGitRoot(initialPath?: string): string {
  const candidates = [
    initialPath,
    process.cwd(),
    join(process.cwd(), "opendex"),
    "c:\\Users\\govin\\Downloads\\exodua\\opendex",
  ].filter((p): p is string => Boolean(p && existsSync(p)));

  for (const candidate of candidates) {
    if (existsSync(join(candidate, ".git"))) {
      return candidate;
    }
  }

  // Fallback to process.cwd()
  return initialPath || process.cwd();
}

/**
 * In Developer Mode: Directly stages all files (`git add .`), creates a commit,
 * and pushes changes to GitHub on the active branch.
 */
export async function devModeGitPush(
  commitMessage?: string,
  workspacePath?: string,
): Promise<DevGitPushResult> {
  const gitRoot = resolveGitRoot(workspacePath);

  try {
    // 1. Verify this is a git repository
    await runGit("git rev-parse --is-inside-work-tree", gitRoot);

    // 2. Stage all modifications, new files, and deletions
    await runGit("git add -A", gitRoot);

    // 3. Inspect status to count changed files
    const statusOutput = await runGit("git status --porcelain", gitRoot);
    const changedFiles = statusOutput
      ? statusOutput.split("\n").filter((l) => l.trim().length > 0)
      : [];

    let commitHash = "";

    if (changedFiles.length > 0) {
      // 4. Create commit
      const autoMessage = `feat: update project implementation (developer mode sync - ${new Date().toLocaleDateString()})`;
      const finalMessage = (commitMessage && commitMessage.trim().length > 0) ? commitMessage.trim() : autoMessage;
      
      // Escape double quotes for shell execution
      const sanitizedMsg = finalMessage.replace(/"/g, '\\"');
      await runGit(`git commit -m "${sanitizedMsg}"`, gitRoot);
    }

    // 5. Determine active branch
    let branch = "main";
    try {
      const currentBranch = await runGit("git branch --show-current", gitRoot);
      if (currentBranch) branch = currentBranch;
    } catch {
      // default to main
    }

    // 6. Push changes to GitHub
    await runGit(`git push origin ${branch}`, gitRoot);

    // 7. Retrieve commit hash
    try {
      commitHash = await runGit("git rev-parse --short HEAD", gitRoot);
    } catch {
      commitHash = "latest";
    }

    const message = changedFiles.length > 0
      ? `Directly added ${changedFiles.length} file(s), committed, and pushed to GitHub on ${branch} (${commitHash}).`
      : `Pushed latest commits to GitHub on branch ${branch} (${commitHash}). Working tree is clean.`;

    return {
      ok: true,
      commitHash,
      filesChanged: changedFiles.length,
      branch,
      message,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[TalkIt DevMode] gitPush failed:", errorMsg);
    return {
      ok: false,
      error: errorMsg,
    };
  }
}


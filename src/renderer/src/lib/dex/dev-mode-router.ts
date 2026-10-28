import type { DevCatchMeUpSummary, DevGitPushResult, DevImplementationPlanSummary, DevModeState } from "../../../../main/developer/types";

/**
 * Classifies whether an utterance is a Developer Mode session query.
 */
export function isCatchMeUpQuery(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return (
    norm.includes("catch me up") ||
    norm.includes("catch us up") ||
    norm.includes("what has been implemented") ||
    norm.includes("what is implemented") ||
    norm.includes("what was implemented") ||
    norm.includes("what's been done") ||
    norm.includes("what has been done") ||
    norm.includes("what is still pending") ||
    norm.includes("what is pending") ||
    norm.includes("what's pending") ||
    norm.includes("developer status") ||
    norm.includes("session status")
  );
}

export function isImplementationPlanQuery(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return (
    norm.includes("implementation plan") ||
    norm.includes("give me the plan") ||
    norm.includes("show me the plan") ||
    norm.includes("give me an implementation plan") ||
    norm.includes("what is the implementation plan") ||
    norm.includes("what is the plan") ||
    norm.includes("what's the plan")
  );
}

export function isGitPushQuery(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return (
    norm.includes("push to github") ||
    norm.includes("push changes to github") ||
    norm.includes("push the changes to github") ||
    norm.includes("push this code to github") ||
    norm.includes("push the code to github") ||
    norm.includes("push to git") ||
    norm.includes("commit and push") ||
    norm.includes("git push")
  );
}

export function isDevSessionQuery(text: string): boolean {
  return isCatchMeUpQuery(text) || isImplementationPlanQuery(text) || isGitPushQuery(text);
}

export function formatPlanForSpeech(plan: DevImplementationPlanSummary): string {
  if (plan.steps.length === 0) {
    if (plan.clarificationNeeded) {
      return `Implementation plan unavailable. Note: ${plan.clarificationNeeded}`;
    }
    return "No explicit steps found and insufficient session evidence to formulate a proposal.";
  }

  // Strictly 10 lines (1 line per step)
  return plan.steps
    .map((s) => `${s.stepNumber}. ${s.description} [${s.status.toUpperCase()}]`)
    .join("\n");
}

export interface DevVoiceQueryResult {
  handled: boolean;
  reply?: string;
  isCatchMeUp?: boolean;
  isPlan?: boolean;
}

export async function handleDevModeVoiceQuery(
  userText: string,
  devModeApi: {
    getState: () => Promise<DevModeState>;
    catchMeUp: () => Promise<DevCatchMeUpSummary>;
    getPlan: () => Promise<DevImplementationPlanSummary>;
    ask: (question: string) => Promise<string>;
    gitPush?: (commitMessage?: string) => Promise<DevGitPushResult>;
  }
): Promise<DevVoiceQueryResult> {
  const catchMeUp = isCatchMeUpQuery(userText);
  const plan = isImplementationPlanQuery(userText);
  const gitPush = isGitPushQuery(userText);

  if (!catchMeUp && !plan && !gitPush) {
    return { handled: false };
  }

  const state = await devModeApi.getState();
  if (!state.enabled) {
    return {
      handled: true,
      reply:
        "Developer Mode is currently disabled. Please toggle Developer Mode on from the screen to begin monitoring your coding environment.",
      isCatchMeUp: catchMeUp,
      isPlan: plan,
    };
  }

  // Handle direct git push in developer mode
  if (gitPush) {
    if (!devModeApi.gitPush) {
      return {
        handled: true,
        reply: "Git push automation is unavailable in the current environment.",
      };
    }
    const res = await devModeApi.gitPush();
    if (!res.ok) {
      return {
        handled: true,
        reply: `Git push failed: ${res.error || "Unknown git error"}`,
      };
    }
    const hashInfo = res.commitHash ? ` as commit ${res.commitHash}` : "";
    const filesInfo = res.filesChanged !== undefined ? ` (${res.filesChanged} file${res.filesChanged === 1 ? "" : "s"} updated)` : "";
    return {
      handled: true,
      reply: `Directly staged all files, committed${hashInfo}${filesInfo}, and pushed to GitHub branch ${res.branch || "main"}.`,
    };
  }

  // Combined query: "catch me up implementation plan"
  if (catchMeUp && plan) {
    const [summary, planSummary] = await Promise.all([
      devModeApi.catchMeUp(),
      devModeApi.getPlan(),
    ]);
    return {
      handled: true,
      reply: `${summary.summary}\n\n${formatPlanForSpeech(planSummary)}`,
      isCatchMeUp: true,
      isPlan: true,
    };
  }

  // 5-line catch-up summary
  if (catchMeUp) {
    const summary = await devModeApi.catchMeUp();
    return {
      handled: true,
      reply: summary.summary,
      isCatchMeUp: true,
    };
  }

  // 10-line implementation plan
  if (plan) {
    const planSummary = await devModeApi.getPlan();
    return {
      handled: true,
      reply: formatPlanForSpeech(planSummary),
      isPlan: true,
    };
  }

  return { handled: false };
}

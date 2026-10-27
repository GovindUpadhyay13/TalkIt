import type { DevCatchMeUpSummary, DevImplementationPlanSummary, DevModeState } from "../../../../main/developer/types";

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

export function isDevSessionQuery(text: string): boolean {
  return isCatchMeUpQuery(text) || isImplementationPlanQuery(text);
}

export function formatPlanForSpeech(plan: DevImplementationPlanSummary): string {
  const intro = plan.isProposed
    ? "Here is a newly generated implementation plan proposal based on available session evidence:"
    : "Here is the implementation plan captured from the session:";

  if (plan.steps.length === 0) {
    if (plan.clarificationNeeded) {
      return `${intro} No concrete steps could be verified. Note: ${plan.clarificationNeeded}`;
    }
    return `${intro} No explicit steps found and insufficient session evidence to formulate a proposal.`;
  }

  const stepsText = plan.steps
    .map(
      (s) =>
        `Step ${s.stepNumber}: ${s.description}. Status: ${s.status}. Verification: ${s.verificationCriteria}.`
    )
    .join(" ");

  return `${intro} ${stepsText}`;
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
  }
): Promise<DevVoiceQueryResult> {
  const catchMeUp = isCatchMeUpQuery(userText);
  const plan = isImplementationPlanQuery(userText);

  if (!catchMeUp && !plan) {
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

  if (catchMeUp) {
    const summary = await devModeApi.catchMeUp();
    return {
      handled: true,
      reply: summary.summary,
      isCatchMeUp: true,
    };
  }

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

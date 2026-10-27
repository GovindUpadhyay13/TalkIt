import React, { useEffect, useState } from "react";
import {
  Code2,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  Trash2,
  Send,
  X,
  FileCode,
  Info,
  Power,
  RefreshCw,
} from "lucide-react";
import type {
  DevModeState,
  DevCatchMeUpSummary,
  DevImplementationPlanSummary,
} from "../../../../main/developer/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DeveloperCompanionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeveloperCompanion({ isOpen, onClose }: DeveloperCompanionProps) {
  const [state, setState] = useState<DevModeState>({
    enabled: false,
    monitoring: false,
    connected: false,
    source: "antigravity",
    connectionStatus: "disconnected",
    activeSessionId: null,
    activeWorkspace: null,
    lastEventTimestamp: null,
    eventCount: 0,
    hasGaps: false,
    activePendingApprovalsCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [catchMeUp, setCatchMeUp] = useState<DevCatchMeUpSummary | null>(null);
  const [plan, setPlan] = useState<DevImplementationPlanSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "plan" | "ask">("summary");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    if (!window.opendex?.devMode) return;
    window.opendex.devMode.getState().then(setState).catch(console.error);

    const unsubscribe = window.opendex.devMode.onStateChanged((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggle = async () => {
    try {
      setLoading(true);
      const newState = await window.opendex.devMode.toggle(!state.enabled);
      setState(newState);
      if (newState.enabled) {
        // Auto refresh summary on enable
        const sum = await window.opendex.devMode.catchMeUp();
        setCatchMeUp(sum);
      } else {
        setCatchMeUp(null);
        setPlan(null);
        setAnswer(null);
      }
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCatchMeUp = async () => {
    try {
      setLoading(true);
      const sum = await window.opendex.devMode.catchMeUp();
      setCatchMeUp(sum);
      setActiveTab("summary");
    } catch (err) {
      console.error("Catch me up error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPlan = async () => {
    try {
      setLoading(true);
      const planRes = await window.opendex.devMode.getPlan();
      setPlan(planRes);
      setActiveTab("plan");
    } catch (err) {
      console.error("Plan query error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    try {
      setAnswering(true);
      const res = await window.opendex.devMode.ask(question);
      setAnswer(res);
      setActiveTab("ask");
    } catch (err) {
      console.error("Ask error:", err);
      setAnswer("Failed to query session: " + String(err));
    } finally {
      setAnswering(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear stored session data?")) return;
    try {
      setLoading(true);
      await window.opendex.devMode.clear();
      const updated = await window.opendex.devMode.getState();
      setState(updated);
      setCatchMeUp(null);
      setPlan(null);
      setAnswer(null);
    } catch (err) {
      console.error("Clear error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#0c0d0c] text-zinc-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Code2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-wide text-zinc-100">
                  Developer Mode
                </h2>
                <span
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border",
                    state.enabled
                      ? "bg-lime-400/10 text-lime-400 border-lime-400/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}
                >
                  {state.enabled ? "Active Companion" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Background coding observer for Antigravity & local dev environments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Button */}
            <Button
              onClick={handleToggle}
              disabled={loading}
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 font-mono text-xs border transition-all",
                state.enabled
                  ? "bg-lime-500/20 text-lime-300 border-lime-500/40 hover:bg-lime-500/30"
                  : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
              )}
            >
              <Power className={cn("size-3.5", state.enabled && "text-lime-400")} />
              {state.enabled ? "ENABLED" : "ENABLE"}
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/60 text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  state.connectionStatus === "connected"
                    ? "bg-lime-400 animate-pulse"
                    : state.connectionStatus === "connecting"
                    ? "bg-amber-400"
                    : "bg-zinc-600"
                )}
              />
              Source: <span className="text-zinc-200 uppercase">{state.source}</span> (
              {state.connectionStatus})
            </span>

            {state.activeSessionId && (
              <span className="truncate max-w-[220px]" title={state.activeSessionId}>
                Session: <span className="text-zinc-300">{state.activeSessionId.slice(0, 12)}...</span>
              </span>
            )}

            <span>
              Events: <span className="text-zinc-200">{state.eventCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {state.hasGaps && (
              <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                <AlertTriangle className="size-3" /> Gaps detected
              </span>
            )}
            <button
              onClick={handleClear}
              className="text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors text-[11px]"
              title="Clear stored session data"
            >
              <Trash2 className="size-3" /> Clear Data
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/30">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCatchMeUp}
              disabled={!state.enabled || loading}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                activeTab === "summary"
                  ? "bg-lime-400 text-black font-semibold shadow"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-40"
              )}
            >
              <Sparkles className="size-3.5" /> Catch Me Up
            </button>
            <button
              onClick={handleGetPlan}
              disabled={!state.enabled || loading}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                activeTab === "plan"
                  ? "bg-lime-400 text-black font-semibold shadow"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-40"
              )}
            >
              <Clock className="size-3.5" /> Implementation Plan
            </button>
            <button
              onClick={() => setActiveTab("ask")}
              disabled={!state.enabled}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                activeTab === "ask"
                  ? "bg-lime-400 text-black font-semibold shadow"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-40"
              )}
            >
              <Terminal className="size-3.5" /> Ask Session
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-lime-400 font-mono animate-pulse">
              <RefreshCw className="size-3 animate-spin" /> Querying evidence...
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!state.enabled ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                <Code2 className="size-8" />
              </div>
              <h3 className="text-sm font-medium text-zinc-200">Developer Mode is Disabled</h3>
              <p className="text-xs text-zinc-400 max-w-md">
                TalkIt runs completely dormant in the background until enabled. Click <strong>Enable</strong> above to begin securely monitoring events from your Antigravity environment.
              </p>
              <Button
                onClick={handleToggle}
                size="sm"
                className="mt-2 bg-lime-400 text-black hover:bg-lime-500 font-medium"
              >
                Enable Developer Mode
              </Button>
            </div>
          ) : (
            <>
              {/* Gap Warning Banner */}
              {state.hasGaps && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Notice: Incomplete Capture Gap.</span> Some past
                    events were missed during disconnection. The companion strictly summarizes
                    verified evidence and acknowledges missing items.
                  </div>
                </div>
              )}

              {/* Tab 1: Summary / Catch Me Up */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  {catchMeUp ? (
                    <>
                      {/* Original Request Card */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                          <span className="flex items-center gap-1.5">
                            <Info className="size-3.5 text-lime-400" /> Original User Request
                          </span>
                          <span>
                            {catchMeUp.hasOriginalPrompt ? (
                              <span className="text-lime-400">Captured ✓</span>
                            ) : (
                              <span className="text-zinc-500">Unavailable</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-mono bg-black/40 p-3 rounded-lg border border-zinc-800/60 whitespace-pre-wrap">
                          {catchMeUp.originalPrompt}
                        </p>
                      </div>

                      {/* Work Done: Reported vs Verified */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Verified Work */}
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-lime-400 flex items-center gap-1.5 mb-2.5">
                            <CheckCircle2 className="size-4" /> Verified Completed ({catchMeUp.verifiedWork.length})
                          </h4>
                          {catchMeUp.verifiedWork.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No verified completions yet.</p>
                          ) : (
                            <ul className="space-y-2 text-xs text-zinc-300">
                              {catchMeUp.verifiedWork.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-black/30 p-2 rounded border border-zinc-800/50">
                                  <span className="text-lime-400 font-bold">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Reported Work */}
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 mb-2.5">
                            <Clock className="size-4 text-zinc-400" /> Agent-Reported Claims ({catchMeUp.reportedWork.length})
                          </h4>
                          {catchMeUp.reportedWork.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No unverified agent claims.</p>
                          ) : (
                            <ul className="space-y-2 text-xs text-zinc-300">
                              {catchMeUp.reportedWork.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-black/30 p-2 rounded border border-zinc-800/50">
                                  <span className="text-zinc-500">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Work in Progress & Blockers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Work in progress */}
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-2.5">
                            <RefreshCw className="size-4" /> Work In Progress ({catchMeUp.workInProgress.length})
                          </h4>
                          {catchMeUp.workInProgress.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">None currently active.</p>
                          ) : (
                            <ul className="space-y-2 text-xs text-zinc-300">
                              {catchMeUp.workInProgress.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-black/30 p-2 rounded border border-zinc-800/50">
                                  <span className="text-sky-400">⏳</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Failures / Blockers */}
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-2.5">
                            <AlertTriangle className="size-4" /> Errors & Blockers ({catchMeUp.failedItems.length})
                          </h4>
                          {catchMeUp.failedItems.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No failed commands or test errors.</p>
                          ) : (
                            <ul className="space-y-2 text-xs text-zinc-300">
                              {catchMeUp.failedItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-rose-950/20 p-2 rounded border border-rose-900/40 text-rose-300">
                                  <span className="text-rose-400 font-bold">✗</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Approvals */}
                      {catchMeUp.pendingApprovals.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                            <ShieldAlert className="size-4" /> Pending Permissions ({catchMeUp.pendingApprovals.length})
                          </h4>
                          <div className="space-y-2">
                            {catchMeUp.pendingApprovals.map((req, idx) => (
                              <div key={idx} className="p-2.5 rounded bg-black/40 border border-amber-800/30 text-xs">
                                <div className="font-semibold text-amber-300">{req.action}</div>
                                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{req.target}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Text Box */}
                      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className="text-xs font-mono text-zinc-400 mb-2">Evidence-Grounded Spoken Summary:</div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans">{catchMeUp.summary}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 space-y-3">
                      <p className="text-xs text-zinc-400">Click below to generate a concise, evidence-grounded summary of the active session.</p>
                      <Button onClick={handleCatchMeUp} size="sm" className="bg-lime-400 text-black hover:bg-lime-500">
                        ⚡ Catch Me Up Now
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Implementation Plan */}
              {activeTab === "plan" && (
                <div className="space-y-4">
                  {plan ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                        <span className="text-zinc-300 font-medium">
                          {plan.isProposed ? "Newly Generated Plan Proposal (Evidence Grounded)" : "Captured Session Plan"}
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px]">{plan.source}</span>
                      </div>

                      {plan.clarificationNeeded && (
                        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
                          <Info className="size-4 shrink-0" />
                          <span>Note: {plan.clarificationNeeded}</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        {plan.steps.map((step) => (
                          <div
                            key={step.stepNumber}
                            className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-200">
                                Step {step.stepNumber}: {step.description}
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold",
                                  step.status === "completed"
                                    ? "bg-lime-400/20 text-lime-300"
                                    : step.status === "in_progress"
                                    ? "bg-sky-400/20 text-sky-300"
                                    : step.status === "blocked"
                                    ? "bg-rose-400/20 text-rose-300"
                                    : "bg-zinc-800 text-zinc-400"
                                )}
                              >
                                {step.status}
                              </span>
                            </div>

                            <div className="text-zinc-400 text-[11px]">
                              <span className="text-zinc-500">Evidence:</span> {step.evidence}
                            </div>
                            <div className="text-zinc-400 text-[11px]">
                              <span className="text-zinc-500">Verification:</span> {step.verificationCriteria}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-3">
                      <p className="text-xs text-zinc-400">Query the session for an explicit plan or generate an evidence-grounded proposal.</p>
                      <Button onClick={handleGetPlan} size="sm" className="bg-lime-400 text-black hover:bg-lime-500">
                        📋 Get Implementation Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Ask Session */}
              {activeTab === "ask" && (
                <div className="space-y-4">
                  <form onSubmit={handleAsk} className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask e.g. 'What files were modified?' or 'Did test pass?'"
                      className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-lime-400 transition-colors"
                    />
                    <Button
                      type="submit"
                      disabled={answering || !question.trim()}
                      size="sm"
                      className="bg-lime-400 text-black hover:bg-lime-500"
                    >
                      <Send className="size-3.5 mr-1" /> Ask
                    </Button>
                  </form>

                  {answering && (
                    <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                      <RefreshCw className="size-3 animate-spin text-lime-400" /> Grounding answer against session evidence...
                    </div>
                  )}

                  {answer && !answering && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                      <div className="text-xs font-mono text-zinc-400">Response:</div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap">{answer}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/80 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>TalkIt Developer Mode · Zero interference with editor or CLI</span>
          <span className="font-mono">Local evidence-based companion</span>
        </div>
      </div>
    </div>
  );
}

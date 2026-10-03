import type { UIMessage } from "@tanstack/ai-react";

export type ToolCallPart = Extract<UIMessage["parts"][number], { type: "tool-call" }>;
export type ToolResultPart = Extract<UIMessage["parts"][number], { type: "tool-result" }>;

/**
 * A tool-call part's state never reaches "complete"/"error" — that outcome
 * lives on the sibling `tool-result` part keyed by toolCallId. Build a
 * callId→result map per message so call UI resolves to a terminal state.
 */
export function toolResults(m: UIMessage): Map<string, ToolResultPart> {
  const map = new Map<string, ToolResultPart>();
  for (const p of m.parts) if (p.type === "tool-result") map.set(p.toolCallId, p);
  return map;
}

export type ToolCallStatus = "done" | "failed" | "approval" | "pending";

/** Terminal-ish status of a call, joined with its sibling result. */
export function toolCallStatus(call: ToolCallPart, result?: ToolResultPart): ToolCallStatus {
  if (result?.state === "complete") return "done";
  if (result?.state === "error" || call.state === "error") return "failed";
  if (call.state === "approval-requested") return "approval";
  return "pending";
}

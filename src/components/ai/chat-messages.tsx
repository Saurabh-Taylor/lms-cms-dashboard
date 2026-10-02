"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2Icon, CircleDashedIcon, CopyIcon, Loader2Icon, XCircleIcon,
} from "lucide-react";
import { NiyamakMark } from "./niyamak-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UIMessage } from "@tanstack/ai-react";
import { cn } from "@/lib/utils";

type ToolCallPart = Extract<UIMessage["parts"][number], { type: "tool-call" }>;
type ToolResultPart = Extract<UIMessage["parts"][number], { type: "tool-result" }>;

const TOOL_STATE_LABEL: Record<string, string> = {
  "awaiting-input": "queued",
  "input-streaming": "running",
  "input-complete": "running",
  "approval-requested": "awaiting approval",
  "approval-responded": "approved",
  complete: "done",
  error: "failed",
};

/** snake_case tool verbs → present continuous, for the narrated-work status row. */
const TOOL_VERB: Record<string, string> = {
  list: "Listing", get: "Fetching", read: "Reading", search: "Searching",
  create: "Creating", update: "Updating", delete: "Deleting",
  enroll: "Enrolling", audit: "Auditing", send: "Sending",
};

/**
 * A tool-call part's state never reaches "complete"/"error" — that outcome
 * lives on the sibling `tool-result` part keyed by toolCallId. Build a
 * callId→result map per message so chips resolve to a terminal state.
 */
function toolResults(m: UIMessage): Map<string, ToolResultPart> {
  const map = new Map<string, ToolResultPart>();
  for (const p of m.parts) if (p.type === "tool-result") map.set(p.toolCallId, p);
  return map;
}

/** Verb-led label for the in-flight tool call of the trailing assistant turn. */
function activityLabel(messages: UIMessage[]): string {
  const last = messages.at(-1);
  if (last?.role === "assistant") {
    const done = new Set(
      last.parts.filter((p) => p.type === "tool-result").map((p) => p.toolCallId),
    );
    const active = last.parts
      .filter((p): p is ToolCallPart => p.type === "tool-call" && !done.has(p.id) && p.state !== "approval-requested")
      .at(-1);
    if (active) {
      const [verb, ...rest] = active.name.split(/[_-]/);
      const v = TOOL_VERB[verb.toLowerCase()];
      return v ? `${v} ${rest.join(" ")}…` : `Running ${active.name}…`;
    }
    // Tools done, text streaming → the model is writing the answer.
    if (last.parts.some((p) => p.type === "text" && p.content)) return "Responding…";
  }
  return "Thinking…";
}

function ToolChip({ part, result }: { part: ToolCallPart; result?: ToolResultPart }) {
  const done = result?.state === "complete";
  const failed = result?.state === "error";
  const pending = !done && !failed;
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2Icon className="size-3.5 text-emerald-500" />
      ) : failed ? (
        <XCircleIcon className="size-3.5 text-red-500" />
      ) : part.state === "approval-requested" ? (
        <CircleDashedIcon className="size-3.5 text-amber-500" />
      ) : (
        <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
      )}
      <Badge variant="outline" className={cn("font-mono text-[11px] font-normal", done && "text-muted-foreground")}>
        {part.name}
        <span className="ml-1.5 text-[10px] text-muted-foreground">
          {done ? "done" : failed ? "failed" : (TOOL_STATE_LABEL[part.state] ?? (pending ? "running" : part.state))}
        </span>
      </Badge>
    </div>
  );
}

/** Human labels + consequence lines for write tools — the card is the contract the admin signs. */
const WRITE_TOOL_DISPLAY: Record<string, { title: string; hint: string }> = {
  enroll_learners: {
    title: "Enroll learners",
    hint: "Creates the enrollments and notifies each learner.",
  },
  create_announcement: {
    title: "Create announcement",
    hint: "Draft stays private; 'sent' publishes to the audience immediately.",
  },
  update_announcement: {
    title: "Update announcement",
    hint: "Edits the existing announcement — omitted fields stay unchanged.",
  },
  send_announcement: {
    title: "Send announcement",
    hint: "Publishes to the audience immediately — this can't be unsent.",
  },
};

function formatArgValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length > 8 ? `${v.slice(0, 8).join(", ")} +${v.length - 8} more` : v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ApprovalCard({ part, onResponse }: {
  part: ToolCallPart;
  onResponse: (id: string, approved: boolean) => void;
}) {
  const approvalId = "approval" in part ? part.approval?.id : undefined;
  const display = WRITE_TOOL_DISPLAY[part.name];
  let args: [string, unknown][] = [];
  try {
    const parsed = JSON.parse(part.arguments || "{}");
    if (parsed && typeof parsed === "object") args = Object.entries(parsed);
  } catch { /* malformed — fall back to raw below */ }
  return (
    <Card className="border-amber-500/40 bg-amber-500/5 py-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CircleDashedIcon className="size-4 text-amber-500" />
          {display?.title ?? "Approval required"}
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">{part.name}</Badge>
        </div>
        {display?.hint && <p className="mt-1 text-xs text-muted-foreground">{display.hint}</p>}
        {args.length > 0 ? (
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            {args.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="truncate font-mono" title={formatArgValue(v)}>{formatArgValue(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 break-all font-mono text-xs text-muted-foreground">{part.arguments}</p>
        )}
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" disabled={!approvalId} onClick={() => approvalId && onResponse(approvalId, true)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={!approvalId} onClick={() => approvalId && onResponse(approvalId, false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChatMessages({ messages, loading, onApprovalResponse }: {
  messages: UIMessage[];
  loading: boolean;
  onApprovalResponse: (id: string, approved: boolean) => void;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  // Pinned-scroll: autoscroll only while the sentinel is already inside the
  // scrollport — never drag a reading user to the bottom mid-stream.
  const pinnedRef = React.useRef(true);
  React.useEffect(() => {
    const end = endRef.current;
    const root = end?.closest('[data-slot="scroll-area-viewport"]') ?? null;
    if (!end || !root) return;
    const io = new IntersectionObserver(
      ([e]) => { pinnedRef.current = e.isIntersecting; },
      { root },
    );
    io.observe(end);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    // A fresh user message always pins — the sender expects their turn in view.
    if (pinnedRef.current || messages.at(-1)?.role === "user") {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => {
        const results = m.role === "assistant" ? toolResults(m) : undefined;
        return (
          <React.Fragment key={m.id}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {m.parts.filter((p) => p.type === "text").map((p) => ("content" in p ? p.content : "")).join("")}
                </div>
              </div>
            ) : (
              m.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <div key={i} className="group relative">
                      <div className="text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy response"
                        onClick={() => navigator.clipboard.writeText(part.content)}
                        className="absolute -top-1 right-0 rounded-md border bg-popover p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <CopyIcon className="size-3" />
                      </button>
                    </div>
                  );
                }
                if (part.type === "thinking") {
                  return (
                    <details key={i} className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none">Reasoning</summary>
                      <div className="mt-1 whitespace-pre-wrap border-l-2 pl-2">{part.content}</div>
                    </details>
                  );
                }
                if (part.type === "tool-call") {
                  return part.state === "approval-requested" ? (
                    <ApprovalCard key={part.id ?? i} part={part} onResponse={onApprovalResponse} />
                  ) : (
                    <ToolChip key={part.id ?? i} part={part} result={results?.get(part.id)} />
                  );
                }
                return null;
              })
            )}
          </React.Fragment>
        );
      })}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <NiyamakMark className="size-3.5 text-primary" active />
          <span className="animate-pulse">{activityLabel(messages)}</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

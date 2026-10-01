"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  CheckCircle2Icon, CircleDashedIcon, Loader2Icon, SparklesIcon, XCircleIcon,
} from "lucide-react";
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

function ToolChip({ part, result }: { part: ToolCallPart; result?: ToolResultPart }) {
  const done = result?.state === "complete";
  const failed = result?.state === "error";
  const pending = !done && !failed;
  return (
    <div className="flex items-center gap-2 pl-6">
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

function ApprovalCard({ part, onResponse }: {
  part: ToolCallPart;
  onResponse: (id: string, approved: boolean) => void;
}) {
  const approvalId = "approval" in part ? part.approval?.id : undefined;
  return (
    <Card className="ml-6 border-amber-500/40 bg-amber-500/5 py-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CircleDashedIcon className="size-4 text-amber-500" />
          Approval required
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">{part.name}</Badge>
        </div>
        <p className="mt-1.5 break-all font-mono text-xs text-muted-foreground">{part.arguments}</p>
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

export function ChatMessages({ messages, onApprovalResponse }: {
  messages: UIMessage[];
  onApprovalResponse: (id: string, approved: boolean) => void;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
                    <div key={i} className="flex gap-2">
                      <SparklesIcon className="mt-1 size-4 shrink-0 text-primary" />
                      <div className="max-w-[85%] text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
                        <ReactMarkdown>{part.content}</ReactMarkdown>
                      </div>
                    </div>
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
      <div ref={endRef} />
    </div>
  );
}

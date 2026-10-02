"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useChat, fetchServerSentEvents, localStoragePersistence } from "@tanstack/ai-react";
import {
  CheckCircle2Icon, ClockIcon, HistoryIcon, Loader2Icon, Maximize2Icon,
  Minimize2Icon, PanelRightIcon, PlusIcon, SquareIcon, Trash2Icon, XCircleIcon, XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ModelPicker, type AiModel } from "./model-picker";
import { NiyamakMark } from "./niyamak-mark";
import { NIYAMAK_WRITE_TOOLS } from "./niyamak-tools";
import {
  THREAD_KEY_PREFIX, listThreads, removeThread, touchThread, type ThreadMeta,
} from "./thread-store";

// Connection adapter is stable across renders — hoisted so useChat never
// re-instantiates (which would drop the conversation) on drawer↔float swaps.
const AI_CONNECTION = fetchServerSentEvents("/api/ai/chat");
const AI_PERSISTENCE = localStoragePersistence({ keyPrefix: THREAD_KEY_PREFIX });

/** Page-contextual starter prompts — key is a pathname segment match. */
const SUGGESTIONS: [RegExp, string[]][] = [
  [/\/learners/, ["Who hasn't been active this week?", "Learners close to finishing a course"]],
  [/\/courses/, ["Which courses have low completion?", "Summarize the newest course"]],
  [/\/enrollments/, ["Recent enrollment activity", "Any failed enrollments today?"]],
  [/\/(analytics|reports)/, ["Give me a platform overview", "Completion rate trend this month"]],
  [/\/assessments/, ["Which assessments have the lowest scores?", "Pending assessment reviews"]],
  [/\/assignments/, ["Any assignments pending review?", "Overdue submissions this week"]],
  [/\/(audit|activity)/, ["Summarize recent admin activity", "Any unusual actions today?"]],
  [/\/certificates/, ["Certificates issued this month", "Any failed certificate runs?"]],
  [/\/announcements/, ["Draft an announcement for course updates", "Which announcements are scheduled?"]],
];
const FALLBACK_SUGGESTIONS = [
  "Give me a platform overview",
  "Which courses have low completion?",
  "Recent enrollment activity",
];

type Mode = "drawer" | "float";
type Chat = ReturnType<typeof useChat>;

interface AiPanelApi {
  open: () => void;
}
const AiPanelContext = React.createContext<AiPanelApi>({ open: () => {} });
export const useAiPanel = () => React.useContext(AiPanelContext);

function useAiConfig(enabled: boolean) {
  return useQuery({
    queryKey: ["ai", "config"],
    queryFn: () => api<{ configured: boolean; model: string; locked?: boolean }>("/api/ai/config"),
    staleTime: 60_000,
    enabled,
  });
}

function useAiModels(enabled: boolean) {
  return useQuery({
    queryKey: ["ai", "models"],
    queryFn: () => api<AiModel[]>("/api/ai/models"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

const MODEL_PREF_KEY = "microshala-ai:model";

/** Matches --duration-moderate (200ms) in globals.css — keep in sync. */
const PANEL_ANIM_MS = 200;
type Phase = "open" | "closing";

const RAIL_FADE = "animate-in fade-in-0 duration-(--duration-moderate) h-full motion-reduce:animate-none";

function useSelectedModel(defaultModel?: string) {
  const [selected, setSelected] = React.useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(MODEL_PREF_KEY),
  );
  const select = React.useCallback((id: string | null) => {
    setSelected(id);
    if (id) localStorage.setItem(MODEL_PREF_KEY, id);
    else localStorage.removeItem(MODEL_PREF_KEY);
  }, []);
  return { selected, effective: selected || defaultModel, select };
}

function EmptyState({ configured }: { configured?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <NiyamakMark className="size-6 text-primary" />
      </div>
      {configured === false ? (
        <div>
          <p className="text-base font-semibold">Niyamak isn’t configured</p>
          <p className="mt-1 max-w-72 text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1 text-xs">OPENROUTER_API_KEY</code> on the API and restart.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-base font-semibold">Ask Niyamak anything about your LMS</p>
          <p className="mt-1 max-w-72 text-sm text-muted-foreground">
            Learners, courses, enrollments, stats — I can look things up and run actions with your approval.
          </p>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ mode, onModeChange, onClose, threadId, modelPicker, detailsOpen, onToggleDetails, working }: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
  threadId: string;
  modelPicker: React.ReactNode;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  working?: boolean;
}) {
  return (
    <div className="border-b">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <NiyamakMark className="size-4 text-primary" active={working} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Niyamak</span>
          <span className="text-[10px] leading-tight text-muted-foreground">The one who governs</span>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {mode === "float" && onToggleDetails && (
            <Button
              variant="ghost" size="icon-sm" onClick={onToggleDetails}
              aria-label="Toggle run details" className={cn(detailsOpen && "bg-muted")}
            >
              <PanelRightIcon className="size-4" />
            </Button>
          )}
          {mode === "drawer" ? (
            <Button variant="ghost" size="icon-sm" onClick={() => onModeChange("float")} aria-label="Expand">
              <Maximize2Icon className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={() => onModeChange("drawer")} aria-label="Dock to drawer">
              <Minimize2Icon className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
        {modelPicker}
        <span aria-hidden>|</span>
        <span>Thread: {threadId.slice(0, 13)}…</span>
      </div>
    </div>
  );
}

function ThreadRail({ threads, activeId, onSelect, onNew, onDelete }: {
  threads: ThreadMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center justify-between border-b px-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <HistoryIcon className="size-3.5" /> Threads
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onNew} aria-label="New chat">
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {threads.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations yet</p>
        )}
        {threads.map((t) => (
          <div
            key={t.id}
            className={cn(
              "group flex w-full items-center gap-1 border-b border-border/50 px-3 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/50",
              t.id === activeId &&
                "bg-accent font-medium text-accent-foreground shadow-[inset_2px_0_0_var(--primary)] hover:bg-accent",
            )}
          >
            <button
              onClick={() => onSelect(t.id)}
              aria-current={t.id === activeId ? "true" : undefined}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-xs font-medium">{t.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(t.updatedAt).toLocaleDateString()}
              </span>
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="invisible shrink-0 text-muted-foreground hover:text-red-500 group-hover:visible focus-visible:visible"
              aria-label="Delete thread"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}

type ToolCallPart = Extract<Chat["messages"][number]["parts"][number], { type: "tool-call" }>;
type ToolResultPart = Extract<Chat["messages"][number]["parts"][number], { type: "tool-result" }>;

/** Per-call status icon — the tool-call part's terminal state lives on its tool-result sibling. */
function CallIcon({ call, result }: { call: ToolCallPart; result?: ToolResultPart }) {
  if (result?.state === "complete") return <CheckCircle2Icon className="size-3 shrink-0 text-emerald-500" />;
  if (result?.state === "error" || call.state === "error") return <XCircleIcon className="size-3 shrink-0 text-red-500" />;
  if (call.state === "approval-requested") return <ClockIcon className="size-3 shrink-0 text-amber-500" />;
  return <Loader2Icon className="size-3 shrink-0 animate-spin text-muted-foreground" />;
}

function DetailsRail({ chat, model }: { chat: Chat; model?: string }) {
  // Chronological tool calls joined to their results by toolCallId — the same
  // join ChatMessages performs for the inline chips.
  const calls = chat.messages.flatMap((m) => {
    const results = new Map<string, ToolResultPart>();
    for (const p of m.parts) if (p.type === "tool-result") results.set(p.toolCallId, p);
    return m.parts
      .filter((p): p is ToolCallPart => p.type === "tool-call")
      .map((call) => ({ call, result: results.get(call.id) }));
  });
  const pendingApprovals = calls.filter((c) => c.call.state === "approval-requested").length;
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-l bg-muted/30">
      <div className="flex h-14 items-center border-b px-3 text-xs font-medium text-muted-foreground">Run details</div>
      <div className="flex flex-col gap-4 p-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-medium">
            <span className={cn("size-1.5 rounded-full", chat.isLoading ? "animate-pulse bg-amber-500" : "bg-emerald-500")} />
            {chat.isLoading ? "Running" : "Ready"}
            <span className="font-normal text-muted-foreground">· {chat.messages.length} messages</span>
          </div>
        </div>
        {pendingApprovals > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 font-medium text-amber-600 dark:text-amber-400">
            {pendingApprovals} awaiting approval
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tool calls</div>
          {calls.length === 0 ? (
            <p className="mt-1 text-muted-foreground">No tool calls yet</p>
          ) : (
            <div className="mt-1 flex flex-col">
              {calls.map(({ call, result }, i) => (
                <div key={call.id} className="relative flex items-center gap-2 py-1">
                  {i < calls.length - 1 && (
                    <span className="absolute left-[5.5px] top-4 h-[calc(100%-8px)] w-px bg-border" />
                  )}
                  <CallIcon call={call} result={result} />
                  <span className="truncate font-mono text-[11px]">{call.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Model</div>
          <div className="mt-0.5 font-mono text-[11px]">{model ?? "…"}</div>
        </div>
      </div>
    </aside>
  );
}

function ChatBody({ chat, configured, onSend }: {
  chat: Chat;
  configured?: boolean;
  onSend: (title: string) => void;
}) {
  const { messages, sendMessage, isLoading, error, stop } = chat;
  const [input, setInput] = React.useState("");
  const pathname = usePathname();
  const suggestions = SUGGESTIONS.find(([re]) => re.test(pathname))?.[1] ?? FALLBACK_SUGGESTIONS;
  const onApprovalResponse = React.useCallback(
    (id: string, approved: boolean) => void chat.addToolApprovalResponse({ id, approved }),
    [chat],
  );

  const send = (text: string) => {
    if (!text.trim() || isLoading || configured === false) return;
    console.log(`[niyamak] send "${text.trim().slice(0, 80)}"`); // TEMP #86
    onSend(text.trim().slice(0, 60));
    sendMessage(text.trim());
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-moderate) motion-reduce:animate-none">
        {messages.length === 0 ? (
          <EmptyState configured={configured} />
        ) : (
          <ChatMessages messages={messages} loading={isLoading} onApprovalResponse={onApprovalResponse} />
        )}
      </ScrollArea>
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </div>
      )}
      {messages.length === 0 && configured !== false && (
        <div className="flex flex-wrap justify-center gap-1.5 px-4 pb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={configured === false}
          placeholder="Ask Niyamak about learners, courses, or tell it to do something…"
          className="min-w-0 flex-1"
        />
        {isLoading && (
          <Button type="button" size="icon-sm" variant="outline" onClick={stop} aria-label="Stop">
            <SquareIcon className="size-3.5" />
          </Button>
        )}
      </form>
      <p className="px-3 pb-2 text-center text-[10px] text-muted-foreground/60">
        Niyamak can make mistakes — verify important actions.
      </p>
    </div>
  );
}

/** One useChat instance per thread — `key={threadId}` remount swaps conversations. */
function ChatSession({ threadId, mode, onModeChange, onClose, threads, onSelectThread, onNewThread, onDeleteThread, onThreadUsed, detailsOpen, onToggleDetails, configured, model, modelPicker }: {
  threadId: string;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
  threads: ThreadMeta[];
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onThreadUsed: (id: string, title: string) => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  configured?: boolean;
  model?: string;
  modelPicker: React.ReactNode;
}) {
  // Stable identity — a fresh literal every render would re-fire
  // client.updateOptions each commit. Always passing {model} (undefined
  // serialized away) also clears a stale selection once config loads.
  const forwardedProps = React.useMemo(() => ({ model }), [model]);
  const chat = useChat({
    threadId,
    connection: AI_CONNECTION,
    persistence: AI_PERSISTENCE,
    // Write-tool declarations (no execute) — without them InterruptManager
    // marks approval interrupts unresolvable and Approve never submits.
    tools: NIYAMAK_WRITE_TOOLS,
    forwardedProps,
    // TEMP #86 trace — client-side view of the same event stream.
    onChunk: (chunk: unknown) => {
      const t = (chunk as { type?: string })?.type;
      if (t && t !== "TEXT_MESSAGE_CONTENT") console.log(`[niyamak] evt ${t}`);
    },
    onFinish: () => console.log("[niyamak] run finished"),
    onError: (e: unknown) => console.error("[niyamak] run error", e),
  });
  const handleSend = React.useCallback(
    (title: string) => onThreadUsed(threadId, title),
    [onThreadUsed, threadId],
  );

  // Siblings are keyed so inserting/removing the rails on mode switches
  // reconciles by key — the chat body keeps its DOM and draft input.
  return (
    <>
      {mode === "float" && (
        <div key="rail" className={RAIL_FADE}>
          <ThreadRail
            threads={threads}
            activeId={threadId}
            onSelect={onSelectThread}
            onNew={onNewThread}
            onDelete={onDeleteThread}
          />
        </div>
      )}
      <div key="body" className="flex min-w-0 flex-1 flex-col">
        <PanelHeader
          mode={mode}
          onModeChange={onModeChange}
          onClose={onClose}
          threadId={threadId}
          modelPicker={modelPicker}
          detailsOpen={detailsOpen}
          onToggleDetails={onToggleDetails}
          working={chat.isLoading}
        />
        <ChatBody chat={chat} configured={configured} onSend={handleSend} />
      </div>
      {mode === "float" && detailsOpen && (
        <div key="details" className={RAIL_FADE}>
          <DetailsRail chat={chat} model={model} />
        </div>
      )}
    </>
  );
}

/**
 * AI copilot panel — hybrid container (decision #82): right-side drawer by
 * default, expands to a floating card with thread rail + run-details rail +
 * meta row. Threads persist client-side via localStoragePersistence until the
 * backend thread store lands (spec phase 5).
 */
export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("open");
  const [mode, setMode] = React.useState<Mode>("drawer");
  const [threadId, setThreadId] = React.useState(() => crypto.randomUUID());
  const [threads, setThreads] = React.useState<ThreadMeta[]>([]);
  const [detailsOpen, setDetailsOpen] = React.useState(true);
  const config = useAiConfig(isOpen);
  const models = useAiModels(isOpen);
  const { selected: selectedModel, effective: effectiveModel, select: selectModel } =
    useSelectedModel(config.data?.model);
  const phaseTimer = React.useRef<number>(undefined);

  // A stale persisted id (model removed upstream) would be sent on every run —
  // reconcile against the catalog once it loads. Only on success: a failed
  // fetch never touches the user's selection.
  React.useEffect(() => {
    if (models.data && selectedModel && !models.data.some((m) => m.id === selectedModel)) {
      selectModel(null);
    }
  }, [models.data, selectedModel, selectModel]);

  const open = React.useCallback(() => {
    window.clearTimeout(phaseTimer.current);
    setThreads(listThreads());
    setPhase("open");
    setIsOpen(true);
  }, []);
  const close = React.useCallback(() => {
    window.clearTimeout(phaseTimer.current);
    setPhase("closing");
    phaseTimer.current = window.setTimeout(() => setIsOpen(false), PANEL_ANIM_MS);
  }, []);

  // FLIP morph for drawer↔float: capture the rect before the mode flip,
  // then animate transform (GPU-only) from the old geometry to the new.
  const panelRef = React.useRef<HTMLDivElement>(null);
  const prevRect = React.useRef<DOMRect>(undefined);
  const morphTo = React.useCallback((m: Mode) => {
    prevRect.current = panelRef.current?.getBoundingClientRect();
    setMode(m);
  }, []);
  React.useLayoutEffect(() => {
    const el = panelRef.current;
    const before = prevRect.current;
    prevRect.current = undefined;
    if (!el || !before) return;
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const sx = before.width / after.width;
    const sy = before.height / after.height;
    if (!dx && !dy && sx === 1 && sy === 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: before.width > after.width ? "12px" : "0px" },
        { transform: "none", borderRadius: before.width > after.width ? "0px" : "12px" },
      ],
      { duration: PANEL_ANIM_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" }, // --ease-standard
    );
  }, [mode]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  React.useEffect(() => () => window.clearTimeout(phaseTimer.current), []);

  const newThread = React.useCallback(() => setThreadId(crypto.randomUUID()), []);
  const onThreadUsed = React.useCallback((id: string, title: string) => {
    touchThread(id, title);
    setThreads(listThreads());
  }, []);
  const onDeleteThread = React.useCallback(
    (id: string) => {
      removeThread(id);
      setThreads(listThreads());
      if (id === threadId) newThread();
    },
    [threadId, newThread],
  );

  const session = (
    <ChatSession
      key={threadId}
      threadId={threadId}
      mode={mode}
      onModeChange={morphTo}
      onClose={close}
      threads={threads}
      onSelectThread={setThreadId}
      onNewThread={newThread}
      onDeleteThread={onDeleteThread}
      onThreadUsed={onThreadUsed}
      detailsOpen={detailsOpen}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      configured={config.data?.configured}
      model={config.data?.locked ? config.data?.model : effectiveModel}
      modelPicker={
        <ModelPicker
          models={models.data ?? []}
          value={selectedModel}
          defaultModel={config.data?.model}
          locked={config.data?.locked}
          onSelect={selectModel}
        />
      }
    />
  );

  return (
    <AiPanelContext.Provider value={{ open }}>
      {children}
      {/* One surface, transitions only (transform/opacity — never layout
          props). Enter rides `@starting-style` (the `starting:` variant),
          exit holds the element mounted through `phase === "closing"`, and
          the drawer↔float mode switch morphs via WAAPI FLIP so ChatSession
          never unmounts and streams survive. */}
      {isOpen && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div
            aria-hidden
            onClick={mode === "float" ? close : undefined}
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-(--duration-moderate)",
              mode === "float" && phase !== "closing"
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Niyamak — AI admin copilot"
            className={cn(
              "pointer-events-auto absolute flex overflow-hidden bg-background shadow-xl",
              "transition-[transform,opacity] duration-(--duration-moderate)",
              phase === "closing" ? "ease-(--ease-exit)" : "ease-(--ease-enter)",
              mode === "float"
                ? "top-[10vh] right-[max(1.5rem,calc(50%_-_32rem))] h-[80vh] w-[min(64rem,calc(100%_-_3rem))] rounded-xl border starting:opacity-0 motion-safe:starting:scale-95"
                : "top-0 right-0 h-full w-[420px] max-w-full rounded-none border-l starting:opacity-0 motion-safe:starting:translate-x-full",
              phase === "closing" &&
                (mode === "float" ? "opacity-0 motion-safe:scale-95" : "opacity-0 motion-safe:translate-x-full"),
            )}
          >
            {session}
          </div>
        </div>
      )}
    </AiPanelContext.Provider>
  );
}

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useChat, fetchServerSentEvents, localStoragePersistence } from "@tanstack/ai-react";
import {
  HistoryIcon, Maximize2Icon, Minimize2Icon, PanelRightIcon,
  PlusIcon, SparklesIcon, SquareIcon, Trash2Icon, XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ModelPicker, type AiModel } from "./model-picker";
import {
  THREAD_KEY_PREFIX, listThreads, removeThread, touchThread, type ThreadMeta,
} from "./thread-store";

// Connection adapter is stable across renders — hoisted so useChat never
// re-instantiates (which would drop the conversation) on drawer↔float swaps.
const AI_CONNECTION = fetchServerSentEvents("/api/ai/chat");
const AI_PERSISTENCE = localStoragePersistence({ keyPrefix: THREAD_KEY_PREFIX });

const SUGGESTIONS = [
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
    queryFn: () => api<{ configured: boolean; model: string }>("/api/ai/config"),
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

function useSelectedModel(defaultModel?: string) {
  const [selected, setSelected] = React.useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(MODEL_PREF_KEY),
  );
  const select = React.useCallback((id: string | null) => {
    setSelected(id);
    if (id) localStorage.setItem(MODEL_PREF_KEY, id);
    else localStorage.removeItem(MODEL_PREF_KEY);
  }, []);
  return { selected, effective: selected ?? defaultModel, select };
}

function EmptyState({ configured }: { configured?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <SparklesIcon className="size-6 text-primary" />
      </div>
      {configured === false ? (
        <div>
          <p className="text-base font-semibold">AI assistant isn’t configured</p>
          <p className="mt-1 max-w-72 text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1 text-xs">OPENROUTER_API_KEY</code> on the API and restart.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-base font-semibold">Ask me anything about your LMS</p>
          <p className="mt-1 max-w-72 text-sm text-muted-foreground">
            Learners, courses, enrollments, stats — I can look things up and run actions with your approval.
          </p>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ mode, onModeChange, onClose, threadId, modelPicker, detailsOpen, onToggleDetails }: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
  threadId: string;
  modelPicker: React.ReactNode;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
}) {
  return (
    <div className="border-b">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <SparklesIcon className="size-4 text-primary" />
        </div>
        <span className="text-sm font-semibold">AI Assistant</span>
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
    <aside className="flex w-52 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
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
              "group flex w-full items-center gap-1 border-b border-border/50 px-3 py-2.5 hover:bg-muted/50",
              t.id === activeId && "bg-muted/40",
            )}
          >
            <button onClick={() => onSelect(t.id)} className="min-w-0 flex-1 text-left">
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

function DetailsRail({ chat, model }: { chat: Chat; model?: string }) {
  const tools = chat.messages.flatMap((m) =>
    m.parts.filter((p) => p.type === "tool-call").map((p) => p.name),
  );
  const pendingApprovals = chat.messages.flatMap((m) =>
    m.parts.filter((p) => p.type === "tool-call" && p.state === "approval-requested"),
  ).length;
  return (
    <aside className="flex w-56 shrink-0 flex-col border-l">
      <div className="border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">Run details</div>
      <div className="flex flex-col gap-3 p-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-medium">
            <span className={cn("size-1.5 rounded-full", chat.isLoading ? "animate-pulse bg-amber-500" : "bg-emerald-500")} />
            {chat.isLoading ? "Running" : "Ready"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tools used</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {tools.length === 0 && <span className="text-muted-foreground">—</span>}
            {[...new Set(tools)].map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-[10px] font-normal">{t}</Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending approvals</div>
          <div className="mt-0.5 font-medium">{pendingApprovals || "—"}</div>
        </div>
        <div>
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
  const onApprovalResponse = React.useCallback(
    (id: string, approved: boolean) => void chat.addToolApprovalResponse({ id, approved }),
    [chat],
  );

  const send = (text: string) => {
    if (!text.trim() || isLoading || configured === false) return;
    onSend(text.trim().slice(0, 60));
    sendMessage(text.trim());
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <EmptyState configured={configured} />
        ) : (
          <ChatMessages messages={messages} onApprovalResponse={onApprovalResponse} />
        )}
      </ScrollArea>
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </div>
      )}
      {messages.length === 0 && configured !== false && (
        <div className="flex flex-wrap justify-center gap-1.5 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
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
          placeholder="Ask about learners, courses, or tell me to do something…"
          className="min-w-0 flex-1"
        />
        {isLoading && (
          <Button type="button" size="icon-sm" variant="outline" onClick={stop} aria-label="Stop">
            <SquareIcon className="size-3.5" />
          </Button>
        )}
      </form>
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
    forwardedProps,
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
        <ThreadRail
          key="rail"
          threads={threads}
          activeId={threadId}
          onSelect={onSelectThread}
          onNew={onNewThread}
          onDelete={onDeleteThread}
        />
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
        />
        <ChatBody chat={chat} configured={configured} onSend={handleSend} />
      </div>
      {mode === "float" && detailsOpen && <DetailsRail key="details" chat={chat} model={model} />}
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
  const [mode, setMode] = React.useState<Mode>("drawer");
  const [threadId, setThreadId] = React.useState(() => crypto.randomUUID());
  const [threads, setThreads] = React.useState<ThreadMeta[]>([]);
  const [detailsOpen, setDetailsOpen] = React.useState(true);
  const config = useAiConfig(isOpen);
  const models = useAiModels(isOpen);
  const { selected: selectedModel, effective: effectiveModel, select: selectModel } =
    useSelectedModel(config.data?.model);
  const open = React.useCallback(() => {
    setThreads(listThreads());
    setIsOpen(true);
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

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
      onModeChange={setMode}
      onClose={close}
      threads={threads}
      onSelectThread={setThreadId}
      onNewThread={newThread}
      onDeleteThread={onDeleteThread}
      onThreadUsed={onThreadUsed}
      detailsOpen={detailsOpen}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      configured={config.data?.configured}
      model={effectiveModel}
      modelPicker={
        <ModelPicker
          models={models.data ?? []}
          value={selectedModel}
          defaultModel={config.data?.model}
          onSelect={selectModel}
        />
      }
    />
  );

  return (
    <AiPanelContext.Provider value={{ open }}>
      {children}
      {/* One container, mode swaps classes only — ChatSession's fiber stays
          mounted across drawer↔float so useChat state (and any in-flight
          stream) survives; it remounts only on thread switch (key change). */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40",
            mode === "float"
              ? "inset-0 flex items-center justify-center bg-black/40 p-6"
              : "inset-y-0 right-0 w-[420px] max-w-full",
          )}
        >
          <div
            role="dialog"
            aria-label="AI Assistant"
            className={cn(
              "flex bg-background",
              mode === "float"
                ? "h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl border shadow-2xl"
                : "h-full w-full border-l shadow-xl",
            )}
          >
            {session}
          </div>
        </div>
      )}
    </AiPanelContext.Provider>
  );
}

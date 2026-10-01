"use client";

import * as React from "react";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import {
  Maximize2Icon, Minimize2Icon, SparklesIcon, SquareIcon, XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatMessages } from "./chat-messages";

// Connection adapter is stable across renders — hoisted so useChat never
// re-instantiates (which would drop the conversation) on drawer↔float swaps.
const AI_CONNECTION = fetchServerSentEvents("/api/ai/chat");

const SUGGESTIONS = [
  "Give me a platform overview",
  "Which courses have low completion?",
  "Recent enrollment activity",
];

type Mode = "drawer" | "float";
type Chat = ReturnType<typeof useChat>;

const AiPanelContext = React.createContext<{ open: () => void }>({ open: () => {} });
export const useAiPanel = () => React.useContext(AiPanelContext);

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <SparklesIcon className="size-6 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold">Ask me anything about your LMS</p>
        <p className="mt-1 max-w-72 text-sm text-muted-foreground">
          Learners, courses, enrollments, stats — I can look things up and run actions with your approval.
        </p>
      </div>
    </div>
  );
}

function PanelHeader({ mode, onModeChange, onClose }: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b px-4 py-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
        <SparklesIcon className="size-4 text-primary" />
      </div>
      <span className="text-sm font-semibold">AI Assistant</span>
      <div className="ml-auto flex items-center gap-0.5">
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
  );
}

function ChatView({ chat, mode, onModeChange, onClose }: {
  chat: Chat;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
}) {
  const { messages, sendMessage, isLoading, error, stop } = chat;
  const [input, setInput] = React.useState("");
  const onApprovalResponse = React.useCallback(
    (id: string, approved: boolean) => void chat.addToolApprovalResponse({ id, approved }),
    [chat],
  );

  const send = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage(text.trim());
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader mode={mode} onModeChange={onModeChange} onClose={onClose} />
      <ScrollArea className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ChatMessages messages={messages} onApprovalResponse={onApprovalResponse} />
        )}
      </ScrollArea>
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </div>
      )}
      {messages.length === 0 && (
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

/**
 * AI copilot panel — hybrid container (decision #82): right-side drawer by
 * default, expands to a floating centered card. useChat lives on the provider
 * so drawer↔float switches preserve the conversation. Mounted in AdminShell;
 * opened via the header Sparkles button (`useAiPanel().open()`).
 */
export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("drawer");
  // useChat must stay mounted across drawer↔float — hoist above the containers.
  const chat = useChat({ connection: AI_CONNECTION });
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  return (
    <AiPanelContext.Provider value={{ open }}>
      {children}
      {isOpen &&
        (mode === "drawer" ? (
          <Sheet open onOpenChange={(o) => !o && close()}>
            <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:max-w-[420px]">
              <SheetHeader className="sr-only">
                <SheetTitle>AI Assistant</SheetTitle>
              </SheetHeader>
              <ChatView chat={chat} mode={mode} onModeChange={setMode} onClose={close} />
            </SheetContent>
          </Sheet>
        ) : (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
            <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
              <ChatView chat={chat} mode={mode} onModeChange={setMode} onClose={close} />
            </div>
          </div>
        ))}
    </AiPanelContext.Provider>
  );
}

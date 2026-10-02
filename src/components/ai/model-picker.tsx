"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, LockIcon, WrenchIcon } from "lucide-react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AiModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export type { AiModel };

const DEFAULT_ITEM_VALUE = "__default__";

function formatContext(n: number | null) {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
}

/** Bucket models by provider prefix (`openai`, `anthropic`, `z-ai`, …) for scannable groups. */
function groupByProvider(models: AiModel[]) {
  const map = new Map<string, AiModel[]>();
  for (const m of models) {
    // Strip the `~` "latest-alias" prefix so ~deepseek/x lands under `deepseek`.
    const provider = m.id.replace(/^~/, "").split("/")[0] || "other";
    const list = map.get(provider);
    if (list) list.push(m);
    else map.set(provider, [m]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Searchable OpenRouter model picker — grouped catalog, persisted selection, env default. */
export function ModelPicker({ models, value, defaultModel, locked, onSelect }: {
  models: AiModel[];
  value: string | null;
  defaultModel?: string;
  locked?: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  // Under AI_MODEL_LOCKED the server drops overrides — the trigger can only
  // ever show the env model, never a stale persisted pick.
  const effective = locked ? defaultModel : (value ?? defaultModel);
  const label = effective ?? "Select model";
  const groups = React.useMemo(() => groupByProvider(models), [models]);

  if (models.length === 0) {
    return <span className="truncate font-mono text-[10px] text-muted-foreground">{label}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex min-w-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-[color,background-color,border-color,transform] duration-(--duration-fast) hover:border-border hover:bg-muted/50 hover:text-foreground active:scale-[0.97] data-open:border-border data-open:bg-muted/60 data-open:text-foreground"
        aria-label="Select model"
      >
        {locked && <LockIcon className="size-3 shrink-0 opacity-60" />}
        <span className="max-w-52 truncate">{label}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <Command>
          <CommandInput placeholder={`Search ${models.length} models…`} />
          <CommandList>
            <CommandEmpty>No models match your search.</CommandEmpty>
            {defaultModel && (
              <CommandGroup heading="Default">
                <CommandItem
                  value={`${DEFAULT_ITEM_VALUE} ${defaultModel}`}
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <CheckIcon className={cn("size-3.5", locked || value === null ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{defaultModel}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">env</span>
                </CommandItem>
              </CommandGroup>
            )}
            {defaultModel && <CommandSeparator />}
            {groups.map(([provider, list]) => (
              <CommandGroup key={provider} heading={provider}>
                {list.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.id} ${m.name}`}
                    disabled={locked}
                    onSelect={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon className={cn("size-3.5", (locked ? m.id === defaultModel : value === m.id) ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate" title={m.id}>{m.name}</span>
                    {m.supportsTools && (
                      <WrenchIcon className="size-3 shrink-0 text-muted-foreground" aria-label="Supports tools" />
                    )}
                    {m.contextLength && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatContext(m.contextLength)}
                      </span>
                    )}
                    {locked && <LockIcon className="size-3 shrink-0 text-muted-foreground" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="border-t px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
          {locked ? `Locked to ${defaultModel} · ` : ""}{models.length} models · OpenRouter
        </div>
      </PopoverContent>
    </Popover>
  );
}

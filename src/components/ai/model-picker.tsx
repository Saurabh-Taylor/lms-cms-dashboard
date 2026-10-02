"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, WrenchIcon } from "lucide-react";
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AiModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export type { AiModel };

const DEFAULT_ITEM_VALUE = "__default__";

function formatContext(n: number | null) {
  if (!n) return "";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`;
}

/** Searchable OpenRouter model picker — compact trigger shows the effective model. */
export function ModelPicker({ models, value, defaultModel, onSelect }: {
  models: AiModel[];
  value: string | null;
  defaultModel?: string;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const effective = value ?? defaultModel;
  const label = effective ?? "Select model";

  if (models.length === 0) {
    return <span className="truncate font-mono text-[10px] text-muted-foreground">{label}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex min-w-0 items-center gap-1 rounded font-mono text-[10px] text-muted-foreground hover:text-foreground"
        aria-label="Select model"
      >
        <span className="max-w-44 truncate">{label}</span>
        <ChevronsUpDownIcon className="size-3 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            {defaultModel && (
              <CommandItem
                value={`${DEFAULT_ITEM_VALUE} ${defaultModel}`}
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <CheckIcon className={cn("size-3.5", value === null ? "opacity-100" : "opacity-0")} />
                <span className="truncate">Default — {defaultModel}</span>
              </CommandItem>
            )}
            {models.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.id} ${m.name}`}
                onSelect={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                <CheckIcon className={cn("size-3.5", value === m.id ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                {m.supportsTools && (
                  <WrenchIcon className="size-3 shrink-0 text-muted-foreground" aria-label="Supports tools" />
                )}
                {m.contextLength && (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatContext(m.contextLength)}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

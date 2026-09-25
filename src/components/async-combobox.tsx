"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { OptionItem } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/**
 * Server-searched combobox for large datasets (learners, courses…).
 * mode="single" → value: OptionItem | null
 * mode="multi"  → value: OptionItem[]
 */
interface AsyncComboboxProps {
  resource: string;
  mode?: "single" | "multi";
  value: OptionItem[] | OptionItem | null;
  onChange: (v: OptionItem[] | OptionItem | null) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function AsyncCombobox({
  resource, mode = "single", value, onChange,
  placeholder = "Select…", emptyText = "No results", className,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search, 250);

  const q = useQuery({
    queryKey: ["options", resource, debounced],
    queryFn: () => api<OptionItem[]>(`/api/admin/options?resource=${resource}&q=${encodeURIComponent(debounced)}`),
    enabled: open,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const options = q.data ?? [];
  const loading = q.isFetching;

  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const selectedIds = new Set(selected.map((s) => s.id));

  const toggle = (item: OptionItem) => {
    if (mode === "single") {
      onChange(selectedIds.has(item.id) ? null : item);
      setOpen(false);
    } else {
      const arr = Array.isArray(value) ? value : [];
      onChange(selectedIds.has(item.id) ? arr.filter((s) => s.id !== item.id) : [...arr, item]);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button variant="outline" className="w-full justify-between font-normal" />}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : mode === "single"
                ? selected[0].label
                : `${selected.length} selected`}
          </span>
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder={`Search ${resource}…`} value={search} onValueChange={setSearch} />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <LoaderCircleIcon className="size-4 animate-spin" /> Searching…
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem key={o.id} value={String(o.id)} onSelect={() => toggle(o)}>
                      <CheckIcon className={cn("size-4", selectedIds.has(o.id) ? "opacity-100" : "opacity-0")} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{o.label}</span>
                        {o.sub && <span className="truncate text-xs text-muted-foreground">{o.sub}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {mode === "multi" && selected.length > 0 && (
        <div className="flex max-h-24 flex-wrap gap-1 overflow-auto">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1">
              <span className="max-w-40 truncate">{s.label}</span>
              <button
                onClick={() => toggle(s)}
                className="rounded-full hover:text-foreground"
                aria-label={`Remove ${s.label}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { XIcon } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterSelectProps {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  allLabel?: string;
  className?: string;
}

export function FilterSelect({
  value, onChange, options, placeholder, allLabel, className = "w-40",
}: FilterSelectProps) {
  const selected = value ? options.find((o) => o.value === value) : undefined;
  return (
    <div className="relative flex items-center">
      <Select
        value={value ?? "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? undefined : String(v))}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            className,
            "transition-[color,border-color,background-color] duration-(--duration-fast)",
            value ? "pr-6 border-primary/40 text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="flex-1 truncate text-left">
            {selected ? selected.label : (allLabel ?? placeholder)}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{allLabel ?? `All ${placeholder.toLowerCase()}`}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <button
          type="button"
          aria-label={`Clear ${placeholder}`}
          className="absolute right-6 text-muted-foreground transition-colors duration-(--duration-instant) hover:text-foreground animate-in fade-in zoom-in-75"
          onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

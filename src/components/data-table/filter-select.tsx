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
    <div className="relative flex w-fit items-center">
      <Select
        value={value ?? "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? undefined : String(v))}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            className,
            "transition-[color,border-color,background-color] duration-(--duration-fast)",
            value ? "border-primary/40 text-foreground" : "text-muted-foreground",
          )}
        >
          <span className={cn("flex-1 truncate text-left", value && "mr-8")}>
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
          className="absolute right-8 grid size-5 place-items-center rounded-full text-muted-foreground transition-colors duration-(--duration-instant) hover:bg-muted hover:text-foreground animate-in fade-in zoom-in-75"
          onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

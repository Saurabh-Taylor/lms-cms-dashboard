"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenIcon, ClipboardCheckIcon, LoaderCircleIcon,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { LearnerSearchResults } from "@/lib/learner-types";
import type { OptionItem } from "@/lib/types";
import { LEARNER_NAV } from "@/lib/nav-learner";
import { useDebounce } from "@/hooks/use-debounce";

/** Learner-scoped command palette — searches only learner-visible data. */
export function LearnerCommandPalette({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const debounced = useDebounce(q, 250);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setQ("");
  }

  const search = useQuery({
    queryKey: ["/api/learner/search", debounced],
    queryFn: () => api<LearnerSearchResults>(`/api/learner/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length >= 2,
    placeholderData: (prev) => prev,
  });
  const results = debounced.length >= 2 ? (search.data ?? null) : null;
  const loading = search.isFetching;

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href as never);
  };

  const group = (label: string, icon: React.ReactNode, items: OptionItem[], hrefFor: (o: OptionItem) => string) =>
    items.length > 0 && (
      <CommandGroup heading={label}>
        {items.map((o) => (
          <CommandItem key={`${label}-${o.id}`} value={`${label}-${o.id}-${o.label}`} onSelect={() => go(hrefFor(o))}>
            {icon}
            <span className="truncate">{o.label}</span>
            {o.sub && <span className="ml-auto truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{o.sub}</span>}
          </CommandItem>
        ))}
      </CommandGroup>
    );

  const empty = !loading && debounced.length >= 2 && results &&
    !results.courses.length && !results.assessments.length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search my courses, assessments…" value={q} onValueChange={setQ} />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" /> Searching…
          </div>
        )}
        {empty && <CommandEmpty>No results for “{debounced}”.</CommandEmpty>}
        {!debounced && (
          <CommandGroup heading="Quick links">
            {LEARNER_NAV.flatMap((g) => g.items).map((i) => (
              <CommandItem key={i.href} value={`go-${i.href}`} onSelect={() => go(i.href)}>
                <i.icon /> {i.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && (
          <>
            {group("My courses", <BookOpenIcon />, results.courses, (o) => `/learner/courses/${o.id}`)}
            {group("Assessments", <ClipboardCheckIcon />, results.assessments, () => "/learner/assessments")}
          </>
        )}
      </CommandList>
      <div className="flex items-center gap-4 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 font-medium">↑↓</kbd> Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 font-medium">↵</kbd> Open
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 font-medium">esc</kbd> Close
        </span>
      </div>
    </CommandDialog>
  );
}

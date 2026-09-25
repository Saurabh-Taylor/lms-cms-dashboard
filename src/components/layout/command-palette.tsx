"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenIcon, ClipboardCheckIcon, FlaskConicalIcon,
  GraduationCapIcon, LoaderCircleIcon,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { OptionItem, SearchResults } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";

export function CommandPalette({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const debounced = useDebounce(q, 250);

  // Reset query state when the palette closes (render-phase adjust)
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setQ("");
  }

  const search = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api<SearchResults>(`/api/admin/search?q=${encodeURIComponent(debounced)}`),
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
            {o.sub && <span className="ml-auto truncate text-xs text-muted-foreground">{o.sub}</span>}
          </CommandItem>
        ))}
      </CommandGroup>
    );

  const empty = !loading && debounced.length >= 2 && results &&
    !results.learners.length && !results.courses.length && !results.labs.length && !results.assessments.length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search learners, courses, labs, assessments…" value={q} onValueChange={setQ} />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" /> Searching…
          </div>
        )}
        {empty && <CommandEmpty>No results for “{debounced}”.</CommandEmpty>}
        {!debounced && (
          <CommandGroup heading="Quick links">
            <CommandItem value="new-course" onSelect={() => go("/admin/courses?new=1")}>
              <BookOpenIcon /> Create course
            </CommandItem>
            <CommandItem value="bulk-enroll" onSelect={() => go("/admin/enrollments?bulk=1")}>
              <GraduationCapIcon /> Bulk enroll learners
            </CommandItem>
            <CommandItem value="audit" onSelect={() => go("/admin/audit-logs")}>
              <ClipboardCheckIcon /> Audit logs
            </CommandItem>
          </CommandGroup>
        )}
        {results && (
          <>
            {group("Learners", <GraduationCapIcon />, results.learners, (o) => `/admin/learners/${o.id}`)}
            {group("Courses", <BookOpenIcon />, results.courses, (o) => `/admin/courses/${o.id}`)}
            {group("Labs", <FlaskConicalIcon />, results.labs, (o) => `/admin/labs/${o.id}`)}
            {group("Assessments", <ClipboardCheckIcon />, results.assessments, (o) => `/admin/assessments/${o.id}`)}
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

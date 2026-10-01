"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon, CheckCircle2Icon, InfoIcon, XCircleIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { fmtRelative } from "@/lib/format";
import type { NotificationInbox, NotificationItem } from "@/lib/types";

type Severity = NotificationItem["severity"];

/** Single source for severity color — rows, dots, badges, and tab tint all read here. */
const SEV: Record<
  Severity,
  { icon: typeof InfoIcon; badge: string; dot: string; tab: string }
> = {
  info: {
    icon: InfoIcon,
    badge: "text-blue-600 bg-blue-500/10",
    dot: "bg-blue-500",
    tab: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  success: {
    icon: CheckCircle2Icon,
    badge: "text-emerald-600 bg-emerald-500/10",
    dot: "bg-emerald-500",
    tab: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangleIcon,
    badge: "text-amber-600 bg-amber-500/10",
    dot: "bg-amber-500",
    tab: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  error: {
    icon: XCircleIcon,
    badge: "text-red-600 bg-red-500/10",
    dot: "bg-red-500",
    tab: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

export const SEVERITIES = ["all", "error", "warning", "success", "info"] as const;
export type SeverityFilter = (typeof SEVERITIES)[number];

export function useInbox(severity: SeverityFilter, pageSize = 30, enabled = true) {
  return useQuery({
    queryKey: ["notifications", "inbox", severity, pageSize],
    queryFn: () =>
      api<NotificationInbox>(
        `/api/me/notifications?pageSize=${pageSize}${severity === "all" ? "" : `&severity=${severity}`}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api<{ count: number }>("/api/me/notifications/unread-count"),
    refetchInterval: 30_000,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const router = useRouter();

  const open = async (item: NotificationItem) => {
    if (!item.readAt) {
      api("/api/me/notifications/read", {
        method: "POST",
        body: JSON.stringify({ id: item.id }),
      }).then(invalidate).catch(() => {});
    }
    if (item.link) router.push(item.link as never);
    else invalidate();
  };

  const markAll = async () => {
    await api("/api/me/notifications/read-all", { method: "POST" }).catch(() => {});
    invalidate();
  };

  return { open, markAll };
}

export function timeGroups(items: NotificationItem[]) {
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;
  const now = Date.now();
  const ts = (n: NotificationItem) => now - new Date(n.createdAt).getTime();
  return [
    { label: "Today", rows: items.filter((n) => ts(n) < day) },
    { label: "This week", rows: items.filter((n) => ts(n) >= day && ts(n) < week) },
    { label: "Earlier", rows: items.filter((n) => ts(n) >= week) },
  ].filter((g) => g.rows.length > 0);
}

export function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (i: NotificationItem) => void;
}) {
  const sevStyle = SEV[item.severity] ?? SEV.info;
  return (
    <button
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
        !item.readAt && "bg-muted/30",
      )}
    >
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", sevStyle.badge)}>
        <sevStyle.icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", !item.readAt && "font-medium")}>
          {item.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{item.body}</span>
        <span className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{fmtRelative(item.createdAt)}</span>
          <Badge variant="outline" className={cn("h-4 border-0 px-1 text-[10px] capitalize", sevStyle.badge)}>
            {item.severity}
          </Badge>
        </span>
      </span>
      {!item.readAt && <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", sevStyle.dot)} />}
    </button>
  );
}

/** Severity tab strip — counts come from the inbox payload. */
export function SeverityTabs({
  value,
  onChange,
  counts,
}: {
  value: SeverityFilter;
  onChange: (v: SeverityFilter) => void;
  counts?: NotificationInbox["severityCounts"];
}) {
  const all = counts ? counts.info + counts.success + counts.warning + counts.error : 0;
  return (
    <div className="flex flex-wrap gap-1">
      {SEVERITIES.map((k) => {
        const active = value === k;
        const tint = k === "all" ? "bg-muted font-medium" : SEV[k].tab;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs capitalize transition-colors",
              active ? tint : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            {k !== "all" && <span className={cn("size-1.5 rounded-full", SEV[k].dot)} />}
            {k}
            <span className={cn("text-muted-foreground", active && k !== "all" && "opacity-70")}>
              {k === "all" ? all : (counts?.[k] ?? 0)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Grouped list — severity-filtered items rendered under sticky time headers. */
export function NotificationList({
  items,
  onOpen,
  empty,
}: {
  items: NotificationItem[];
  onOpen: (i: NotificationItem) => void;
  empty?: string;
}) {
  const groups = React.useMemo(() => timeGroups(items), [items]);
  if (!items.length)
    return <p className="p-6 text-center text-sm text-muted-foreground">{empty ?? "Nothing here."}</p>;
  return (
    <>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="sticky top-0 z-10 bg-popover/95 px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
            {g.label}
          </p>
          {g.rows.map((n) => (
            <NotificationRow key={n.id} item={n} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </>
  );
}

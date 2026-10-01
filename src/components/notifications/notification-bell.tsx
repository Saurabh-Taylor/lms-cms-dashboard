"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  NotificationList, SeverityTabs, useInbox, useNotificationActions, useUnreadCount,
  type SeverityFilter,
} from "./notification-list";

/**
 * Bell + right-side notification drawer — severity tabs (prototype A) with
 * time grouping inside each tab (prototype C). Polls unread-count; the inbox
 * query runs only while the drawer is open.
 */
export function NotificationBell({ viewAllHref }: { viewAllHref: string }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<SeverityFilter>("all");
  const unread = useUnreadCount();
  const inbox = useInbox(tab, 30, open);
  const actions = useNotificationActions();

  const count = unread.data?.count ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        <BellIcon className="size-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md" showCloseButton={false}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => actions.markAll()}>
                Mark all read
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>
          <div className="border-b px-4 py-2">
            <SeverityTabs value={tab} onChange={setTab} counts={inbox.data?.severityCounts} />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <NotificationList
              items={inbox.data?.data ?? []}
              onOpen={(i) => {
                setOpen(false);
                actions.open(i);
              }}
              empty={inbox.isPending ? "Loading…" : "Nothing here."}
            />
          </ScrollArea>
          <div className="border-t px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              nativeButton={false}
              render={<Link href={viewAllHref as never} />}
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotificationList, SeverityTabs, useInbox, useNotificationActions,
  type SeverityFilter,
} from "./notification-list";

/** Full-page notification inbox — same union feed as the drawer. */
export function NotificationInboxPage({
  title = "Notifications",
  description,
}: {
  title?: string;
  description: string;
}) {
  const [tab, setTab] = React.useState<SeverityFilter>("all");
  const inbox = useInbox(tab, 50);
  const actions = useNotificationActions();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />
      <div className="flex items-center justify-between gap-3">
        <SeverityTabs value={tab} onChange={setTab} counts={inbox.data?.severityCounts} />
        <Button variant="outline" size="sm" onClick={() => actions.markAll()}>
          Mark all read
        </Button>
      </div>
      <Card className="max-w-3xl overflow-hidden p-0">
        <CardContent className="p-0">
          {inbox.isPending ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <NotificationList
              items={inbox.data?.data ?? []}
              onOpen={actions.open}
              empty="You're all caught up."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

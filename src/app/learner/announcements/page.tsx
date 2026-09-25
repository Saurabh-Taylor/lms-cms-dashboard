"use client";

import { useQuery } from "@tanstack/react-query";
import { MegaphoneIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerAnnouncement } from "@/lib/learner-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDateTime } from "@/lib/format";

export default function LearnerAnnouncementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/learner/announcements"],
    queryFn: () => api<LearnerAnnouncement[]>("/api/learner/announcements"),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Announcements" description="Updates from your learning team" />

      {isLoading ? (
        <div className="flex max-w-3xl flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : data?.length ? (
        <div className="flex max-w-3xl flex-col gap-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium">{a.title}</CardTitle>
                  <span className="shrink-0 text-(length:--fs-meta) leading-4 text-muted-foreground">
                    {fmtDateTime(a.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MegaphoneIcon}
          title="No announcements"
          description="You're all caught up — new announcements will appear here."
        />
      )}
    </div>
  );
}

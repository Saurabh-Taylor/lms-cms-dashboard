"use client";

import { useQuery } from "@tanstack/react-query";
import { AwardIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerCertificate } from "@/lib/learner-types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDate } from "@/lib/format";

export default function LearnerCertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/learner/certificates"],
    queryFn: () => api<LearnerCertificate[]>("/api/learner/certificates"),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Certificates" description="Certificates you've earned" />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <AwardIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.courseTitle}</p>
                  <p className="truncate font-mono text-(length:--fs-meta) leading-4 text-muted-foreground">
                    {c.serial}
                  </p>
                  <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                    Issued {fmtDate(c.issuedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={AwardIcon}
          title="No certificates yet"
          description="Complete a certificate-enabled course to earn one."
        />
      )}
    </div>
  );
}

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { categories, labs } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { LabDetailPanels } from "./detail-panels";
import { fmtDate } from "@/lib/format";

export default async function LabDetailPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  const [row] = await db
    .select({ lab: labs, categoryName: categories.name })
    .from(labs)
    .leftJoin(categories, eq(labs.categoryId, categories.id))
    .where(eq(labs.id, Number(labId)));
  if (!row) notFound();
  const l = row.lab;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={l.name}
        description={`${l.type} · ${l.resourceTier} · ${l.durationMin}m · ${row.categoryName ?? "Uncategorized"} · created ${fmtDate(l.createdAt)}`}
      />
      <div className="flex items-center gap-2">
        <StatusBadge value={l.status} />
        <span className="text-sm text-muted-foreground">{l.assignedCount.toLocaleString()} assigned learners</span>
      </div>
      <Suspense>
        <LabDetailPanels labId={l.id} />
      </Suspense>
    </div>
  );
}

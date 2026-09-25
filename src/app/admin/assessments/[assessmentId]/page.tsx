import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { assessments, courses } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AssessmentDetail } from "./detail";
import { fmtDate } from "@/lib/format";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const [row] = await db
    .select({ a: assessments, courseTitle: courses.title })
    .from(assessments)
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(eq(assessments.id, Number(assessmentId)));
  if (!row) notFound();
  const a = row.a;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={a.title}
        description={`${a.kind} · ${row.courseTitle ?? "unlinked"} · pass ≥ ${a.passingScore}% · created ${fmtDate(a.createdAt)}`}
      />
      <div className="flex items-center gap-2">
        <StatusBadge value={a.status} />
        <span className="text-sm text-muted-foreground">
          {a.attemptCount.toLocaleString()} attempts · avg {a.avgScore}% · pass rate {a.passRate}%
        </span>
      </div>
      <Suspense>
        <AssessmentDetail id={a.id} />
      </Suspense>
    </div>
  );
}

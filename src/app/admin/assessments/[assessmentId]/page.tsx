import { notFound } from "next/navigation";
import { Suspense } from "react";
import { apiServer } from "@/lib/api-server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssessmentDetail } from "./detail";
import { QuestionBank } from "./question-bank";
import { fmtDate } from "@/lib/format";

interface AssessmentDetailRow {
  id: number;
  title: string;
  kind: string;
  status: string;
  passingScore: number;
  attemptCount: number;
  avgScore: number;
  passRate: number;
  createdAt: string;
  courseTitle: string | null;
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const a = await apiServer<AssessmentDetailRow>(`/api/v1/admin/assessments/${Number(assessmentId)}`).catch(() => null);
  if (!a) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={a.title}
        description={`${a.kind} · ${a.courseTitle ?? "unlinked"} · pass ≥ ${a.passingScore}% · created ${fmtDate(a.createdAt)}`}
      />
      <div className="flex items-center gap-2">
        <StatusBadge value={a.status} />
        <span className="text-sm text-muted-foreground">
          {a.attemptCount.toLocaleString()} attempts · avg {a.avgScore}% · pass rate {a.passRate}%
        </span>
      </div>
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="attempts">Attempts</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-4">
          <QuestionBank assessmentId={a.id} />
        </TabsContent>
        <TabsContent value="attempts" className="mt-4">
          <Suspense>
            <AssessmentDetail id={a.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

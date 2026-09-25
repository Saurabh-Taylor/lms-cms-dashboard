import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentsTable, AssessmentActions } from "./assessments-table";

export default function AssessmentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Assessments"
        description="Quizzes and exams across all courses"
        actions={<AssessmentActions />}
      />
      <Suspense>
        <AssessmentsTable />
      </Suspense>
    </div>
  );
}

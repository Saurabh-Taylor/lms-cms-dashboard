import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentsTable, AssessmentActions } from "../assessments/assessments-table";

export default function AssignmentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Assignments"
        description="Graded assignments and projects"
        actions={<AssessmentActions defaultKind="assignment" />}
      />
      <Suspense>
        <AssessmentsTable fixedKind="assignment" />
      </Suspense>
    </div>
  );
}

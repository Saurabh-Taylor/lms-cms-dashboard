import { PageHeader } from "@/components/shared/page-header";
import { AssessmentList } from "@/components/learner/assessment-list";

export const metadata = { title: "Assignments · LearnHub" };

export default function LearnerAssignmentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Assignments" description="Graded assignments and projects on your courses" />
      <AssessmentList
        kind="tasks"
        emptyTitle="No assignments"
        emptyDescription="Assignments from your enrolled courses will show up here."
      />
    </div>
  );
}

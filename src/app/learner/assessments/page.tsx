import { PageHeader } from "@/components/shared/page-header";
import { AssessmentList } from "@/components/learner/assessment-list";

export const metadata = { title: "Assessments · LearnHub" };

export default function LearnerAssessmentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Assessments" description="Quizzes and exams on your enrolled courses" />
      <AssessmentList
        kind="quizzes"
        emptyTitle="No assessments"
        emptyDescription="Quizzes and exams from your enrolled courses will show up here."
      />
    </div>
  );
}

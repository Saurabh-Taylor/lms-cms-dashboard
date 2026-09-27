import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssessmentRunner } from "@/components/learner/assessment-runner";

export const metadata = { title: "Assessment · LearnHub" };

export default async function LearnerAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AssessmentRunner assessmentId={Number(id)} />
    </Suspense>
  );
}

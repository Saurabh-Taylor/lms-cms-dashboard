import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseView } from "@/components/learner/course-view";

export const metadata = { title: "Course · LearnHub" };

export default async function LearnerCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CourseView courseId={Number(id)} />
    </Suspense>
  );
}

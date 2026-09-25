import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";

export default async function CourseLearnersPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Learners" description="Enrollments for this course" />
      <Suspense>
        <EnrollmentsTable fixedCourseId={Number(courseId)} hideCourseCol />
      </Suspense>
    </div>
  );
}

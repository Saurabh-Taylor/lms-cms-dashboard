import { PageHeader } from "@/components/shared/page-header";
import { CourseSettingsForm } from "@/components/courses/course-settings-form";

export default async function CourseSettingsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Course settings" />
      <CourseSettingsForm courseId={Number(courseId)} />
    </div>
  );
}

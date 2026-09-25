import { PageHeader } from "@/components/shared/page-header";
import { CurriculumEditor } from "@/components/courses/curriculum-editor";

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Content"
        description="Organize sections and chapters. Drag to reorder — changes save automatically."
      />
      <CurriculumEditor courseId={Number(courseId)} />
    </div>
  );
}

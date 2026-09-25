import { Suspense } from "react";
import { LessonEditor } from "@/components/courses/lesson-editor";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { lessonId } = await params;
  return (
    <Suspense>
      <LessonEditor lessonId={Number(lessonId)} />
    </Suspense>
  );
}

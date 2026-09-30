import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CourseThumbnail } from "@/components/shared/course-thumbnail";

/**
 * Learner course-card chrome — 16:9 banner thumbnail (color fallback) over a
 * content slot. Shared by the dashboard/My Learning card and the catalog card;
 * the bodies differ (progress CTA vs enroll button) but the shell doesn't.
 */
export function CourseCard({
  course,
  children,
}: {
  course: { thumbnailUrl?: string | null; thumbnailColor: string };
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden transition-shadow duration-(--duration-fast) hover:shadow-sm">
      <CourseThumbnail
        variant="banner"
        thumbnailUrl={course.thumbnailUrl}
        thumbnailColor={course.thumbnailColor}
      />
      <CardContent className="flex flex-col gap-3 pt-4">{children}</CardContent>
    </Card>
  );
}

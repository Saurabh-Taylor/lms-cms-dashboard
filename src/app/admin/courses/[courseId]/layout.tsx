import { notFound } from "next/navigation";
import { apiServer } from "@/lib/api-server";
import { CourseTabs } from "./course-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { CourseThumbnail } from "@/components/shared/course-thumbnail";
import { fmtRelative } from "@/lib/format";

interface CourseDetail {
  id: number;
  title: string;
  status: string;
  thumbnailColor: string;
  thumbnailUrl: string | null;
  categoryName: string | null;
  instructorName: string | null;
  updatedAt: string;
}

export default async function CourseLayout({
  children,
  params,
}: LayoutProps<"/admin/courses/[courseId]">) {
  const { courseId } = await params;
  const c = await apiServer<CourseDetail>(`/api/v1/admin/courses/${Number(courseId)}`).catch(() => null);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <CourseThumbnail
          variant="square"
          size={10}
          thumbnailUrl={c.thumbnailUrl}
          thumbnailColor={c.thumbnailColor}
          title={c.title}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{c.title}</h1>
            <StatusBadge value={c.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {c.categoryName ?? "Uncategorized"} · {c.instructorName ?? "No instructor"} ·
            updated {fmtRelative(c.updatedAt)}
          </p>
        </div>
      </div>
      <CourseTabs courseId={c.id} />
      {children}
    </div>
  );
}

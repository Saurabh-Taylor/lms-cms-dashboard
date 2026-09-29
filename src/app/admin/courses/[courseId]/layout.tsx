import { notFound } from "next/navigation";
import { apiServer } from "@/lib/api-server";
import { CourseTabs } from "./course-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials, fmtRelative } from "@/lib/format";

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
        {c.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not optimizable
          <img
            src={c.thumbnailUrl}
            alt=""
            className="size-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
            style={{ background: c.thumbnailColor }}
          >
            {initials(c.title)}
          </span>
        )}
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

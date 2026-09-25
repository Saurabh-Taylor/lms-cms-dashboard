import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { categories, courses, users } from "@/lib/db/schema";
import { CourseTabs } from "./course-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials, fmtRelative } from "@/lib/format";

export default async function CourseLayout({
  children,
  params,
}: LayoutProps<"/admin/courses/[courseId]">) {
  const { courseId } = await params;
  const [row] = await db
    .select({
      course: courses,
      categoryName: categories.name,
      instructorName: users.name,
    })
    .from(courses)
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.id, Number(courseId)));
  if (!row) notFound();
  const c = row.course;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
          style={{ background: c.thumbnailColor }}
        >
          {initials(c.title)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{c.title}</h1>
            <StatusBadge value={c.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {row.categoryName ?? "Uncategorized"} · {row.instructorName ?? "No instructor"} ·
            updated {fmtRelative(c.updatedAt)}
          </p>
        </div>
      </div>
      <CourseTabs courseId={c.id} />
      {children}
    </div>
  );
}

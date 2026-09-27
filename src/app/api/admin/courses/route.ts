import { eq } from "drizzle-orm";
import { categories, courses, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/courses";
import { PERM } from "@/lib/permissions";

const sortMap = {
  title: courses.title,
  status: courses.status,
  enrollmentCount: courses.enrollmentCount,
  completionRate: courses.completionRate,
  avgProgress: courses.avgProgress,
  lessonCount: courses.lessonCount,
  updatedAt: courses.updatedAt,
  createdAt: courses.createdAt,
} as const;

const shape = {
  id: courses.id,
  title: courses.title,
  slug: courses.slug,
  description: courses.description,
  categoryId: courses.categoryId,
  categoryName: categories.name,
  instructorId: courses.instructorId,
  instructorName: users.name,
  difficulty: courses.difficulty,
  status: courses.status,
  visibility: courses.visibility,
  estimatedMinutes: courses.estimatedMinutes,
  tags: courses.tags,
  thumbnailColor: courses.thumbnailColor,
  certificateEnabled: courses.certificateEnabled,
  enrollmentCount: courses.enrollmentCount,
  completionRate: courses.completionRate,
  avgProgress: courses.avgProgress,
  lessonCount: courses.lessonCount,
  createdAt: courses.createdAt,
  updatedAt: courses.updatedAt,
} as const;

export async function GET(req: Request) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: courses,
    select: shape,
    join: (q) =>
      q
        .leftJoin(categories, eq(courses.categoryId, categories.id))
        .leftJoin(users, eq(courses.instructorId, users.id)),
    filters: (c, lq) => {
      const status = lq.sp.get("status");
      if (status) c.push(eq(courses.status, status as "draft" | "published" | "archived"));
      const categoryId = lq.sp.get("categoryId");
      if (categoryId) c.push(eq(courses.categoryId, Number(categoryId)));
      const instructorId = lq.sp.get("instructorId");
      if (instructorId) c.push(eq(courses.instructorId, Number(instructorId)));
      const difficulty = lq.sp.get("difficulty");
      if (difficulty) c.push(eq(courses.difficulty, difficulty as "beginner"));
      const visibility = lq.sp.get("visibility");
      if (visibility) c.push(eq(courses.visibility, visibility as "public"));
    },
    search: [courses.title],
    sortMap,
    defaultSort: "updatedAt",
  });
}

export const POST = verb<"/api/admin/courses">(PERM.courseCreate, write.create);

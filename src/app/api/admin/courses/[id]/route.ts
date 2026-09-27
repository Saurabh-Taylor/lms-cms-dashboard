import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, courses, users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/courses";
import { PERM } from "@/lib/permissions";

type Ctx = RouteContext<"/api/admin/courses/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const [row] = await db
    .select({
      course: courses,
      categoryName: categories.name,
      instructorName: users.name,
    })
    .from(courses)
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.id, Number(id)));
  if (!row) return fail(404, "Course not found");
  return ok({ ...row.course, ...row });
}

export const PATCH = verb<"/api/admin/courses/[id]">(PERM.courseUpdate, write.update);
export const DELETE = verb<"/api/admin/courses/[id]">(PERM.courseDelete, write.remove);

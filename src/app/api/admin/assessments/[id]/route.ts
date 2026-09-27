import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assessments, courses } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/assessments";
import { PERM } from "@/lib/permissions";

type Ctx = RouteContext<"/api/admin/assessments/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const me = await requirePermission(PERM.assessmentView);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const [row] = await db
    .select({ assessment: assessments, courseTitle: courses.title })
    .from(assessments)
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(eq(assessments.id, Number(id)));
  if (!row) return fail(404, "Assessment not found");
  return ok({ ...row.assessment, courseTitle: row.courseTitle });
}

export const PATCH = verb<"/api/admin/assessments/[id]">(PERM.assessmentUpdate, write.update);
export const DELETE = verb<"/api/admin/assessments/[id]">(PERM.assessmentUpdate, write.remove);

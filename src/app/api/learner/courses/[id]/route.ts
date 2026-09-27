import { fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { getCourseDetail } from "@/lib/learner/data";

export async function GET(_req: Request, ctx: RouteContext<"/api/learner/courses/[id]">) {
  const me = await requireLearner();
  if (me instanceof Response) return me;

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "Invalid course id");

  const detail = getCourseDetail(me.id, id);
  if (!detail) return fail(404, "Course not found or not enrolled");
  return ok(detail);
}

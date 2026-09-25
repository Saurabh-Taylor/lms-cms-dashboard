import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { getCourseDetail } from "@/lib/learner/data";

export async function GET(_req: Request, ctx: RouteContext<"/api/learner/courses/[id]">) {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "Invalid course id");

  const detail = getCourseDetail(me.id, id);
  if (!detail) return fail(404, "Course not found or not enrolled");
  return ok(detail);
}

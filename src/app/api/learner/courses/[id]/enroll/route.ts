import { domainFail, fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { selfEnroll } from "@/lib/learner/catalog";

/** Self-enroll in a published public course (idempotent-denied: repeats → 409). */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/learner/courses/[id]/enroll">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "Invalid course id");
  try {
    return ok(selfEnroll(me.id, id), { status: 201 });
  } catch (e) {
    return domainFail(e);
  }
}

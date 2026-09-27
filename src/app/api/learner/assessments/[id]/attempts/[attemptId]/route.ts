import { domainFail, fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { getAttempt } from "@/lib/learner/assessments";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/learner/assessments/[id]/attempts/[attemptId]">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const attemptId = Number((await ctx.params).attemptId);
  if (!Number.isInteger(attemptId)) return fail(400, "Invalid attempt id");
  try {
    return ok(getAttempt(me.id, attemptId));
  } catch (e) {
    return domainFail(e);
  }
}

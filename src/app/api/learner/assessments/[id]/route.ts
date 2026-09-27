import { domainFail, fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { getAssessmentDetail } from "@/lib/learner/assessments";

export async function GET(_req: Request, ctx: RouteContext<"/api/learner/assessments/[id]">) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "Invalid assessment id");
  try {
    return ok(getAssessmentDetail(me.id, id));
  } catch (e) {
    return domainFail(e);
  }
}

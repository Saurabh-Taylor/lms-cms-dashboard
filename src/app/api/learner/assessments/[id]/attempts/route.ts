import { domainFail, fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { startAttempt } from "@/lib/learner/assessments";

/** Start (or resume) an attempt — returns questions without answers + deadline. */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/learner/assessments/[id]/attempts">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "Invalid assessment id");
  try {
    const res = startAttempt(me.id, id);
    return ok(res, { status: res.resumed ? 200 : 201 });
  } catch (e) {
    return domainFail(e);
  }
}

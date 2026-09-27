import { z } from "zod";
import { domainFail, fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { submitAttempt } from "@/lib/learner/assessments";

const submitSchema = z.object({
  answers: z.record(z.string(), z.array(z.number().int())).default({}),
  submission: z.string().max(20_000).optional(),
});

/** Submit an in-progress attempt — quiz/exam score server-side; assignments
 *  store submission text and await grading. */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/learner/assessments/[id]/attempts/[attemptId]/submit">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const attemptId = Number((await ctx.params).attemptId);
  if (!Number.isInteger(attemptId)) return fail(400, "Invalid attempt id");
  const parsed = submitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid submit payload");

  const answers: Record<number, number[]> = {};
  for (const [k, v] of Object.entries(parsed.data.answers)) {
    const qid = Number(k);
    if (Number.isInteger(qid)) answers[qid] = v;
  }
  try {
    return ok(submitAttempt(me.id, attemptId, { answers, submission: parsed.data.submission }));
  } catch (e) {
    return domainFail(e);
  }
}

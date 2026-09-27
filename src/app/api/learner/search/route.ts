import { ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { learnerSearch } from "@/lib/learner/data";

export async function GET(req: Request) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ courses: [], assessments: [] });
  return ok(learnerSearch(me.id, q));
}

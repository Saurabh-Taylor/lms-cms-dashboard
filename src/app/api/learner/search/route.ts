import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { learnerSearch } from "@/lib/learner/data";

export async function GET(req: Request) {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ courses: [], assessments: [] });
  return ok(learnerSearch(me.id, q));
}

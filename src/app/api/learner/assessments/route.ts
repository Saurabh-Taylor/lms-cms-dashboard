import { ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { listMyAssessments } from "@/lib/learner/data";

export async function GET(req: Request) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const kind = new URL(req.url).searchParams.get("kind") === "tasks" ? "tasks" : "quizzes";
  return ok(listMyAssessments(me.id, kind));
}

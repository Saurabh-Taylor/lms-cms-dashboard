import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { listMyAssessments } from "@/lib/learner/data";

export async function GET(req: Request) {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");
  const kind = new URL(req.url).searchParams.get("kind") === "tasks" ? "tasks" : "quizzes";
  return ok(listMyAssessments(me.id, kind));
}

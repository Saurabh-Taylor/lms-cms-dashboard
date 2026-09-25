import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { learnerDashboard } from "@/lib/learner/data";

export async function GET() {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");
  return ok(learnerDashboard(me.id, me.role));
}

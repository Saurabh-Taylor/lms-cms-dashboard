import { ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { learnerDashboard } from "@/lib/learner/data";

export async function GET() {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  return ok(learnerDashboard(me.id, me.role));
}

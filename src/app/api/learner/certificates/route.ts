import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { listMyCertificates } from "@/lib/learner/data";

export async function GET() {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");
  return ok(listMyCertificates(me.id));
}

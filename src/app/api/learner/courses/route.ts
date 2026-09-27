import { listOk } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { listMyCourses } from "@/lib/learner/data";

export async function GET() {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const courses = listMyCourses(me.id);
  return listOk(courses, courses.length, { page: 1, pageSize: courses.length });
}

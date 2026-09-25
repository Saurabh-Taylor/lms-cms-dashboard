import { like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assessments, courses, labs, users } from "@/lib/db/schema";
import { likePattern, ok } from "@/lib/api/helpers";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ learners: [], courses: [], labs: [], assessments: [] });
  const p = likePattern(q);

  const [learners, coursesR, labsR, assessmentsR] = await Promise.all([
    db.select({ id: users.id, label: users.name, sub: users.email })
      .from(users)
      .where(or(like(users.name, p), like(users.email, p)))
      .limit(5),
    db.select({ id: courses.id, label: courses.title, sub: courses.status })
      .from(courses).where(like(courses.title, p)).limit(5),
    db.select({ id: labs.id, label: labs.name, sub: labs.type })
      .from(labs).where(like(labs.name, p)).limit(5),
    db.select({ id: assessments.id, label: assessments.title, sub: assessments.kind })
      .from(assessments).where(like(assessments.title, p)).limit(5),
  ]);
  return ok({ learners, courses: coursesR, labs: labsR, assessments: assessmentsR });
}

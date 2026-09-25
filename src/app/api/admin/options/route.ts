import { and, asc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assessments, categories, courses, groups, users } from "@/lib/db/schema";
import { likePattern, ok } from "@/lib/api/helpers";

// Async option source for comboboxes: /api/admin/options?resource=learners&q=
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const resource = sp.get("resource") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const p = likePattern(q);
  const limit = 25;

  switch (resource) {
    case "learners":
      return ok(await db
        .select({ id: users.id, label: users.name, sub: users.email })
        .from(users)
        .where(and(eq(users.role, "learner"), q ? or(like(users.name, p), like(users.email, p)) : undefined))
        .orderBy(asc(users.name)).limit(limit));
    case "instructors":
      return ok(await db
        .select({ id: users.id, label: users.name, sub: users.email })
        .from(users)
        .where(and(eq(users.role, "instructor"), q ? or(like(users.name, p), like(users.email, p)) : undefined))
        .orderBy(asc(users.name)).limit(limit));
    case "courses":
      return ok(await db
        .select({ id: courses.id, label: courses.title, sub: courses.status })
        .from(courses)
        .where(q ? like(courses.title, p) : undefined)
        .orderBy(asc(courses.title)).limit(limit));
    case "categories":
      return ok(await db
        .select({ id: categories.id, label: categories.name })
        .from(categories).orderBy(asc(categories.name)).limit(50));
    case "cohorts":
      return ok(await db
        .select({ id: groups.id, label: groups.name })
        .from(groups).orderBy(asc(groups.name)).limit(50));
    case "assessments":
      return ok(await db
        .select({ id: assessments.id, label: assessments.title, sub: assessments.kind })
        .from(assessments)
        .where(q ? like(assessments.title, p) : undefined)
        .orderBy(asc(assessments.title)).limit(limit));
    default:
      return ok([]);
  }
}

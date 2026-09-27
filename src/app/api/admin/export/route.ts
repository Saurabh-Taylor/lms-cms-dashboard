import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, enrollments, users } from "@/lib/db/schema";
import { fail } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";
import { requireAdmin } from "@/lib/me";
import { PERM } from "@/lib/permissions";

const esc = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const RESOURCE_PERMS: Record<string, string> = {
  learners: PERM.learnerView,
  enrollments: PERM.enrollmentView,
  courses: PERM.courseView,
};

export async function GET(req: Request) {
  const me = await requireAdmin();
  if (me instanceof Response) return me;
  const resource = new URL(req.url).searchParams.get("resource") ?? "";
  const perm = RESOURCE_PERMS[resource];
  if (!perm) return fail(400, "resource must be learners|enrollments|courses");
  // Per-resource capability — learner:view doesn't cover enrollments/courses exports.
  if (!me.permissions.includes(perm)) return fail(403, "Forbidden");
  let rows: Record<string, unknown>[];
  let filename: string;

  if (resource === "learners") {
    filename = "learners.csv";
    rows = await db.select({
      id: users.id, name: users.name, email: users.email, status: users.status,
      enrolled_courses: users.enrolledCount, avg_progress: users.avgProgress,
      last_active: users.lastActiveAt, created: users.createdAt,
    }).from(users).where(eq(users.role, "learner"));
  } else if (resource === "enrollments") {
    filename = "enrollments.csv";
    rows = await db.select({
      id: enrollments.id, learner: users.name, email: users.email,
      course: courses.title, status: enrollments.status,
      progress: enrollments.progress, enrolled_at: enrollments.enrolledAt,
    }).from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .orderBy(desc(enrollments.enrolledAt));
  } else if (resource === "courses") {
    filename = "courses.csv";
    rows = await db.select({
      id: courses.id, title: courses.title, status: courses.status,
      difficulty: courses.difficulty, learners: courses.enrollmentCount,
      completion_rate: courses.completionRate, avg_progress: courses.avgProgress,
      updated: courses.updatedAt,
    }).from(courses);
  } else {
    return fail(400, "resource must be learners|enrollments|courses");
  }

  await audit(me, { action: `exported ${resource}`, targetType: resource, targetLabel: filename, module: "reports" });

  const header = Object.keys(rows[0] ?? { empty: "" }).join(",");
  const body = rows.map((r) => Object.values(r).map(esc).join(",")).join("\n");
  return new Response(`${header}\n${body}`, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

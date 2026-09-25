import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, enrollments, users } from "@/lib/db/schema";
import { fail } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const esc = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const resource = new URL(req.url).searchParams.get("resource");
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

  audit({ action: `exported ${resource}`, targetType: resource, targetLabel: filename, module: "reports" });

  const header = Object.keys(rows[0] ?? { empty: "" }).join(",");
  const body = rows.map((r) => Object.values(r).map(esc).join(",")).join("\n");
  return new Response(`${header}\n${body}`, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

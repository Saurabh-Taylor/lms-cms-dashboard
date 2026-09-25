import { and, count, eq, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { assessments, courses } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  title: assessments.title,
  kind: assessments.kind,
  status: assessments.status,
  attemptCount: assessments.attemptCount,
  avgScore: assessments.avgScore,
  passRate: assessments.passRate,
  createdAt: assessments.createdAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const kind = lq.sp.get("kind");
  if (kind) conds.push(eq(assessments.kind, kind as "quiz"));
  const status = lq.sp.get("status");
  if (status) conds.push(eq(assessments.status, status as "draft"));
  const courseId = lq.sp.get("courseId");
  if (courseId) conds.push(eq(assessments.courseId, Number(courseId)));
  if (lq.q) conds.push(like(assessments.title, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: assessments.id, courseId: assessments.courseId, courseTitle: courses.title,
        title: assessments.title, kind: assessments.kind, questionCount: assessments.questionCount,
        passingScore: assessments.passingScore, maxAttempts: assessments.maxAttempts,
        timeLimitMin: assessments.timeLimitMin, shuffleQuestions: assessments.shuffleQuestions,
        showResults: assessments.showResults, status: assessments.status,
        attemptCount: assessments.attemptCount, avgScore: assessments.avgScore,
        passRate: assessments.passRate, createdAt: assessments.createdAt,
      })
      .from(assessments)
      .leftJoin(courses, eq(assessments.courseId, courses.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(assessments).where(where),
  ]);
  return listOk(rows, total, lq);
}

const schema = z.object({
  title: z.string().min(1).max(200),
  kind: z.enum(["quiz", "exam", "assignment"]).default("quiz"),
  courseId: z.number().int().positive().nullish(),
  questionCount: z.number().int().min(0).default(0),
  passingScore: z.number().int().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).default(1),
  timeLimitMin: z.number().int().min(1).default(30),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid assessment payload");
  const [row] = await db
    .insert(assessments)
    .values({ ...parsed.data, status: "draft", createdAt: new Date() })
    .returning();
  audit({ action: `created ${row.kind}`, targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments" });
  return ok(row, { status: 201 });
}

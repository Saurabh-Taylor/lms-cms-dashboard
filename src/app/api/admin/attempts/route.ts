import { and, count, eq, or, like, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assessmentAttempts, assessments, users } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy } from "@/lib/api/helpers";

const sortMap = {
  submittedAt: assessmentAttempts.submittedAt,
  score: assessmentAttempts.score,
  userName: users.name,
  assessmentTitle: assessments.title,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const userId = lq.sp.get("userId");
  if (userId) conds.push(eq(assessmentAttempts.userId, Number(userId)));
  const assessmentId = lq.sp.get("assessmentId");
  if (assessmentId) conds.push(eq(assessmentAttempts.assessmentId, Number(assessmentId)));
  const passed = lq.sp.get("passed");
  if (passed === "true" || passed === "false")
    conds.push(eq(assessmentAttempts.passed, passed === "true"));
  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(users.name, p), like(assessments.title, p))!);
  }
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: assessmentAttempts.id,
        assessmentId: assessmentAttempts.assessmentId,
        assessmentTitle: assessments.title,
        kind: assessments.kind,
        userId: assessmentAttempts.userId,
        userName: users.name,
        attemptNo: assessmentAttempts.attemptNo,
        score: assessmentAttempts.score,
        passed: assessmentAttempts.passed,
        submittedAt: assessmentAttempts.submittedAt,
      })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .innerJoin(users, eq(assessmentAttempts.userId, users.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "submittedAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .innerJoin(users, eq(assessmentAttempts.userId, users.id))
      .where(where),
  ]);
  return listOk(rows, total, lq);
}

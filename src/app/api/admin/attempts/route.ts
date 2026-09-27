import { eq } from "drizzle-orm";
import { assessmentAttempts, assessments, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.assessmentView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: assessmentAttempts,
    select: {
      id: assessmentAttempts.id,
      assessmentId: assessmentAttempts.assessmentId,
      assessmentTitle: assessments.title,
      kind: assessments.kind,
      userId: assessmentAttempts.userId,
      userName: users.name,
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      score: assessmentAttempts.score,
      passed: assessmentAttempts.passed,
      submittedAt: assessmentAttempts.submittedAt,
      submission: assessmentAttempts.submission,
      feedback: assessmentAttempts.feedback,
      gradedAt: assessmentAttempts.gradedAt,
      passingScore: assessments.passingScore,
    },
    join: (q) =>
      q
        .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
        .innerJoin(users, eq(assessmentAttempts.userId, users.id)),
    filters: (c, lq) => {
      const userId = lq.sp.get("userId");
      if (userId) c.push(eq(assessmentAttempts.userId, Number(userId)));
      const assessmentId = lq.sp.get("assessmentId");
      if (assessmentId) c.push(eq(assessmentAttempts.assessmentId, Number(assessmentId)));
      const passed = lq.sp.get("passed");
      if (passed === "true" || passed === "false")
        c.push(eq(assessmentAttempts.passed, passed === "true"));
    },
    search: [users.name, assessments.title],
    sortMap: {
      submittedAt: assessmentAttempts.submittedAt,
      score: assessmentAttempts.score,
      userName: users.name,
      assessmentTitle: assessments.title,
    },
    defaultSort: "submittedAt",
  });
}

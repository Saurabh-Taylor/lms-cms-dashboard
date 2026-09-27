import { eq } from "drizzle-orm";
import { assessments, courses } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/assessments";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.assessmentView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: assessments,
    select: {
      id: assessments.id, courseId: assessments.courseId, courseTitle: courses.title,
      title: assessments.title, kind: assessments.kind, questionCount: assessments.questionCount,
      passingScore: assessments.passingScore, maxAttempts: assessments.maxAttempts,
      timeLimitMin: assessments.timeLimitMin, shuffleQuestions: assessments.shuffleQuestions,
      showResults: assessments.showResults, status: assessments.status,
      attemptCount: assessments.attemptCount, avgScore: assessments.avgScore,
      passRate: assessments.passRate, createdAt: assessments.createdAt,
    },
    join: (q) => q.leftJoin(courses, eq(assessments.courseId, courses.id)),
    filters: (c, lq) => {
      const kind = lq.sp.get("kind");
      if (kind) c.push(eq(assessments.kind, kind as "quiz"));
      const status = lq.sp.get("status");
      if (status) c.push(eq(assessments.status, status as "draft"));
      const courseId = lq.sp.get("courseId");
      if (courseId) c.push(eq(assessments.courseId, Number(courseId)));
    },
    search: [assessments.title],
    sortMap: {
      title: assessments.title,
      kind: assessments.kind,
      status: assessments.status,
      attemptCount: assessments.attemptCount,
      avgScore: assessments.avgScore,
      passRate: assessments.passRate,
      createdAt: assessments.createdAt,
    },
    defaultSort: "createdAt",
  });
}

export const POST = verb<"/api/admin/assessments">(PERM.assessmentCreate, write.create);

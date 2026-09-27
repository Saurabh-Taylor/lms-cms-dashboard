// Semantic operations over derived state — the ONLY place consequence
// ordering lives. Callers produce the source-row change; these ops apply the
// consequences in fixed order:
//   progress (+ active→completed flip detection) → counters → events → certs
// Domain modules call these by name; they never select or order refreshes.
import { sql } from "drizzle-orm";
import {
  type Runner,
  refreshEnrollmentProgress,
  refreshCourseProgress,
  refreshCourseCounters,
  refreshUserCounters,
  issueCompletionCertificates,
  insertCertificate,
} from "./aggregates";

function emitActivity(
  runner: Runner,
  e: { userId: number; type: string; courseId: number; meta?: string }
) {
  runner.run(sql`INSERT INTO activity_events (user_id, type, course_id, meta, created_at)
    VALUES (${e.userId}, ${e.type}, ${e.courseId}, ${e.meta ?? "{}"}, ${Date.now()})`);
}

/**
 * A course's published-lesson set moved (lesson create/publish/unpublish/
 * delete/duplicate, section delete): recompute every enrolled learner's
 * progress + status flips → counters → completion events → auto-issuance.
 * One call so the ordering can't be forgotten or reordered at a write site.
 */
export function lessonSetChanged(runner: Runner, courseId: number) {
  const flips = refreshCourseProgress(runner, [courseId]);
  refreshCourseCounters(runner, [courseId]);
  const enrols = runner.all(
    sql`SELECT id, user_id AS userId FROM enrollments WHERE course_id = ${courseId}`
  ) as { id: number; userId: number }[];
  refreshUserCounters(
    runner,
    enrols.map((e) => e.userId)
  );
  // completion event precedes its certificate in the feed — causal order.
  for (const f of flips)
    emitActivity(runner, { userId: f.userId, type: "course_completed", courseId });
  issueCompletionCertificates(
    runner,
    enrols.map((e) => e.id)
  );
}

export interface CompletionOutcome {
  progress: number;
  status: string;
  certificate: { serial: string } | null;
}

/**
 * A learner recorded a lesson completion (lesson_progress row already
 * inserted by the caller). `changed` distinguishes a real first completion
 * from an idempotent repeat — only real changes emit feed events.
 * Order: chapter event → progress(+flip) → course event → counters → cert.
 */
export function lessonCompleted(
  runner: Runner,
  ctx: {
    enrollmentId: number;
    userId: number;
    courseId: number;
    lessonId: number;
    changed: boolean;
  }
): CompletionOutcome {
  if (ctx.changed)
    emitActivity(runner, {
      userId: ctx.userId,
      type: "chapter_completed",
      courseId: ctx.courseId,
      meta: JSON.stringify({ lessonId: ctx.lessonId }),
    });
  const flips = refreshEnrollmentProgress(runner, [ctx.enrollmentId]);
  for (const f of flips)
    emitActivity(runner, { userId: f.userId, type: "course_completed", courseId: f.courseId });
  refreshCourseCounters(runner, [ctx.courseId]);
  refreshUserCounters(runner, [ctx.userId]);
  const cert = issueCompletionCertificates(runner, [ctx.enrollmentId])[0];
  const row = runner.all(
    sql`SELECT progress, status FROM enrollments WHERE id = ${ctx.enrollmentId}`
  )[0] as { progress: number; status: string };
  return { ...row, certificate: cert ?? null };
}

/** A lesson completion was removed — honest revert: progress + status + counters, no events, no certs. */
export function lessonUncompleted(
  runner: Runner,
  ctx: { enrollmentId: number; userId: number; courseId: number }
): { progress: number; status: string } {
  refreshEnrollmentProgress(runner, [ctx.enrollmentId]);
  refreshCourseCounters(runner, [ctx.courseId]);
  refreshUserCounters(runner, [ctx.userId]);
  return runner.all(
    sql`SELECT progress, status FROM enrollments WHERE id = ${ctx.enrollmentId}`
  )[0] as { progress: number; status: string };
}

/**
 * Manual certificate issuance (admin override — `certificate_enabled` is NOT
 * required; human intent supersedes policy). Eligibility the op enforces:
 * enrollment completed + no existing cert — returns null on dup.
 */
export function issueCertificate(
  runner: Runner,
  ctx: { userId: number; courseId: number }
): { serial: string } | null {
  const exists = runner.all(
    sql`SELECT 1 FROM certificates WHERE user_id = ${ctx.userId} AND course_id = ${ctx.courseId}`
  )[0];
  if (exists) return null;
  return { serial: insertCertificate(runner, ctx) };
}

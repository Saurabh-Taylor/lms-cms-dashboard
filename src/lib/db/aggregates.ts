import { randomBytes } from "node:crypto";
import { sql, type SQLWrapper } from "drizzle-orm";

/**
 * Denormalized-counter maintenance.
 *
 * `courses` and `users` carry derived columns (enrollment_count, lesson_count,
 * enrolled_count, ...) that must be recomputed whenever the source rows
 * (enrollments, sections, lessons) change. The SET clauses below are the single
 * source of truth for those formulas — the seed's bulk recompute and the
 * per-entity refresh functions share them, so the math cannot diverge.
 *
 * Call the refresh functions inside the same better-sqlite3 transaction as the
 * mutation (sync — never await) so counters can never lag behind committed data.
 */

export type Runner = {
  run: (query: SQLWrapper) => unknown;
  all: (query: SQLWrapper) => unknown[];
};

export const COURSE_COUNTERS_SET = `
  enrollment_count = (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = courses.id),
  avg_progress = COALESCE((SELECT CAST(AVG(e.progress) AS INT) FROM enrollments e WHERE e.course_id = courses.id), 0),
  completion_rate = COALESCE((SELECT CAST(100.0 * SUM(e.status = 'completed') / COUNT(*) AS INT) FROM enrollments e WHERE e.course_id = courses.id), 0),
  lesson_count = (SELECT COUNT(*) FROM lessons l JOIN sections s2 ON l.section_id = s2.id WHERE s2.course_id = courses.id)`;

export const USER_COUNTERS_SET = `
  enrolled_count = (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = users.id),
  avg_progress = COALESCE((SELECT CAST(AVG(e.progress) AS INT) FROM enrollments e WHERE e.user_id = users.id), 0)`;

export function refreshCourseCounters(runner: Runner, courseIds: Iterable<number>) {
  for (const id of new Set(courseIds)) {
    runner.run(sql`UPDATE courses SET ${sql.raw(COURSE_COUNTERS_SET)} WHERE id = ${id}`);
  }
}

export function refreshUserCounters(runner: Runner, userIds: Iterable<number>) {
  for (const id of new Set(userIds)) {
    runner.run(sql`UPDATE users SET ${sql.raw(USER_COUNTERS_SET)} WHERE id = ${id}`);
  }
}

/** attempt_count/avg_score/pass_rate count only finalized attempts (an
 *  in-progress attempt is resumable, not a result). question_count is derived
 *  from assessment_questions — admin question CRUD refreshes it. */
export const ASSESSMENT_COUNTERS_SET = `
  attempt_count = (SELECT COUNT(*) FROM assessment_attempts a WHERE a.assessment_id = assessments.id AND a.status != 'in_progress' AND (assessments.kind != 'assignment' OR a.graded_at IS NOT NULL)),
  avg_score = COALESCE((SELECT CAST(AVG(a.score) AS INT) FROM assessment_attempts a WHERE a.assessment_id = assessments.id AND a.status != 'in_progress' AND (assessments.kind != 'assignment' OR a.graded_at IS NOT NULL)), 0),
  pass_rate = COALESCE((SELECT CAST(100.0 * SUM(a.passed) / COUNT(*) AS INT) FROM assessment_attempts a WHERE a.assessment_id = assessments.id AND a.status != 'in_progress' AND (assessments.kind != 'assignment' OR a.graded_at IS NOT NULL)), 0),
  question_count = (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = assessments.id)`;

export function refreshAssessmentCounters(runner: Runner, assessmentIds: Iterable<number>) {
  for (const id of new Set(assessmentIds)) {
    runner.run(sql`UPDATE assessments SET ${sql.raw(ASSESSMENT_COUNTERS_SET)} WHERE id = ${id}`);
  }
}

/**
 * enrollments.progress is derived: completed published lessons ÷ total
 * published lessons in the enrolled course. Never write progress directly —
 * call these after lesson_progress or the published-lesson set changes, then
 * refresh the surrounding counters (course avg_progress/completion_rate and
 * user avg_progress read enrollments.progress).
 */
export const PROGRESS_EXPR = `
  COALESCE(CAST(100.0 * (
    SELECT COUNT(*) FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN sections s ON s.id = l.section_id
    WHERE lp.enrollment_id = enrollments.id
      AND s.course_id = enrollments.course_id
      AND l.status = 'published'
  ) / NULLIF((
    SELECT COUNT(*) FROM lessons l2 JOIN sections s2 ON s2.id = l2.section_id
    WHERE s2.course_id = enrollments.course_id AND l2.status = 'published'
  ), 0) AS INT), 0)`;

export interface EnrollmentFlip {
  id: number;
  userId: number;
  courseId: number;
}

/** Recompute progress for specific enrollments; returns the rows that flipped
 *  active → completed so callers can emit course_completed / issue certs. */
export function refreshEnrollmentProgress(runner: Runner, enrollmentIds: Iterable<number>): EnrollmentFlip[] {
  const flips: EnrollmentFlip[] = [];
  for (const id of new Set(enrollmentIds)) {
    runner.run(sql`UPDATE enrollments SET progress = ${sql.raw(PROGRESS_EXPR)} WHERE id = ${id}`);
    const flip = runner.all(
      sql`SELECT id, user_id AS userId, course_id AS courseId FROM enrollments
          WHERE id = ${id} AND status = 'active' AND progress >= 100`
    )[0] as EnrollmentFlip | undefined;
    if (flip) {
      runner.run(sql`UPDATE enrollments SET status = 'completed', completed_at = ${Date.now()} WHERE id = ${id}`);
      flips.push(flip);
    } else {
      runner.run(sql`UPDATE enrollments SET status = 'active', completed_at = NULL
        WHERE id = ${id} AND status = 'completed' AND progress < 100`);
    }
  }
  return flips;
}

/** Recompute progress for every enrollment in the given courses — the
 *  published-set moved (lesson create/delete/duplicate/status flip, section
 *  delete) so every enrolled learner's denominator changed. Returns flips. */
export function refreshCourseProgress(runner: Runner, courseIds: Iterable<number>): EnrollmentFlip[] {
  const flips: EnrollmentFlip[] = [];
  for (const id of new Set(courseIds)) {
    runner.run(sql`UPDATE enrollments SET progress = ${sql.raw(PROGRESS_EXPR)} WHERE course_id = ${id}`);
    const rows = runner.all(
      sql`SELECT id, user_id AS userId, course_id AS courseId FROM enrollments
          WHERE course_id = ${id} AND status = 'active' AND progress >= 100`
    ) as EnrollmentFlip[];
    for (const f of rows) {
      runner.run(sql`UPDATE enrollments SET status = 'completed', completed_at = ${Date.now()} WHERE id = ${f.id}`);
      flips.push(f);
    }
    runner.run(sql`UPDATE enrollments SET status = 'active', completed_at = NULL
      WHERE course_id = ${id} AND status = 'completed' AND progress < 100`);
  }
  return flips;
}

export function makeCertSerial() {
  // random suffix — batch issuance can share Date.now() across certs
  return `CERT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

/** The one certificate write — row + certificate_earned event. Auto-issuance
 *  and the manual admin path share this so serial/feed parity can't diverge.
 *  Eligibility (completed, enabled, unique) is the caller's check. */
export function insertCertificate(
  runner: Runner,
  r: { userId: number; courseId: number }
): string {
  const serial = makeCertSerial();
  runner.run(sql`INSERT INTO certificates (serial, user_id, course_id, issued_at)
    VALUES (${serial}, ${r.userId}, ${r.courseId}, ${Date.now()})`);
  runner.run(sql`INSERT INTO activity_events (user_id, type, course_id, meta, created_at)
    VALUES (${r.userId}, 'certificate_earned', ${r.courseId}, '{}', ${Date.now()})`);
  return serial;
}

/**
 * Auto-issue certificates: every enrollment that is `completed` on a
 * `certificate_enabled` course and has no cert yet gets one (+ a
 * `certificate_earned` activity event). Un-completion does NOT revoke —
 * a certificate is a record of earned completion; revocation is manual.
 * Returns the issued rows so callers can surface them (toasts, emails).
 */
export function issueCompletionCertificates(
  runner: Runner,
  enrollmentIds: Iterable<number>
): { userId: number; courseId: number; serial: string }[] {
  const issued: { userId: number; courseId: number; serial: string }[] = [];
  for (const id of new Set(enrollmentIds)) {
    const rows = runner.all(sql`
      SELECT e.user_id AS userId, e.course_id AS courseId
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = ${id}
        AND e.status = 'completed'
        AND c.certificate_enabled = 1
        AND NOT EXISTS (
          SELECT 1 FROM certificates ct
          WHERE ct.user_id = e.user_id AND ct.course_id = e.course_id
        )`) as { userId: number; courseId: number }[];
    for (const r of rows) issued.push({ ...r, serial: insertCertificate(runner, r) });
  }
  return issued;
}

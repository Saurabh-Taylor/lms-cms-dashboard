// Learner assessment-attempt domain: gated start/resume, server-side scoring,
// deadline enforcement, counter refresh. quiz/exam score from the question bank;
// assignment is submission-based — learner turns in `submission` text, an admin
// grades it (score+feedback), and metrics count the attempt only once graded.
import { and, eq, max, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  assessmentAttemptAnswers, assessmentAttempts, assessmentQuestions,
  assessments, courses, enrollments, activityEvents,
} from "@/lib/db/schema";
import { refreshAssessmentCounters, type Runner } from "@/lib/db/aggregates";
import { DomainError } from "@/lib/domain";

const GRACE_MS = 60_000; // clock-skew tolerance before a deadline is truly past

type QuestionRow = typeof assessmentQuestions.$inferSelect;
export type AttemptStatus = "in_progress" | "submitted" | "expired";

function parseIdxs(json: string | null | undefined): number[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** The assessment if this learner may see it — published, scorable, enrolled. */
function gate(userId: number, assessmentId: number) {
  const a = db
    .select({ assessment: assessments, courseTitle: courses.title })
    .from(assessments)
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(eq(assessments.id, assessmentId))
    .all()[0];
  if (!a || a.assessment.status !== "published")
    throw new DomainError(404, "Assessment not found");
  if (a.assessment.courseId != null) {
    const enr = db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(eq(enrollments.userId, userId), eq(enrollments.courseId, a.assessment.courseId))
      )
      .all()[0];
    if (!enr) throw new DomainError(403, "Not enrolled in this course");
  }
  return a.assessment;
}

const deadlineOf = (a: typeof assessments.$inferSelect, startedAt: Date | null) =>
  (startedAt?.getTime() ?? Date.now()) + a.timeLimitMin * 60_000;

const isPastDeadline = (
  a: typeof assessments.$inferSelect,
  startedAt: Date | null,
  now = Date.now()
) => now > deadlineOf(a, startedAt) + GRACE_MS;

/** Persist expiry for stale in-progress attempts (mutating calls only). */
function finalizeExpired(runner: Runner, userId: number, assessmentId: number, assessment: typeof assessments.$inferSelect) {
  const open = runner.all(
    sql`SELECT id, started_at FROM assessment_attempts
        WHERE user_id = ${userId} AND assessment_id = ${assessmentId} AND status = 'in_progress'`
  ) as { id: number; started_at: number | null }[];
  let changed = false;
  for (const r of open) {
    if (isPastDeadline(assessment, r.started_at ? new Date(r.started_at) : null)) {
      runner.run(sql`UPDATE assessment_attempts SET status = 'expired' WHERE id = ${r.id}`);
      changed = true;
    }
  }
  if (changed) refreshAssessmentCounters(runner, [assessmentId]);
}

function questionPayload(q: QuestionRow) {
  return {
    id: q.id,
    prompt: q.prompt,
    type: q.type as "single" | "multi" | "tf",
    options: JSON.parse(q.options) as string[],
    points: q.points,
  };
}

function questionsFor(assessmentId: number, orderIds?: number[]) {
  const all = db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(assessmentQuestions.position)
    .all();
  if (!orderIds?.length) return all;
  const byId = new Map(all.map((q) => [q.id, q]));
  return orderIds.map((id) => byId.get(id)).filter((q): q is QuestionRow => !!q);
}

/** Assessment page payload: meta + my attempts + whether a new attempt may start. */
export function getAssessmentDetail(userId: number, assessmentId: number) {
  const a = gate(userId, assessmentId);
  const courseTitle = db
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.id, a.courseId ?? -1))
    .all()[0]?.title ?? null;

  const attempts = db
    .select()
    .from(assessmentAttempts)
    .where(
      and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.assessmentId, assessmentId))
    )
    .orderBy(assessmentAttempts.attemptNo)
    .all();

  const open = attempts.find((t) => t.status === "in_progress" && !isPastDeadline(a, t.startedAt));

  return {
    assessment: {
      id: a.id,
      title: a.title,
      kind: a.kind,
      courseId: a.courseId,
      courseTitle,
      questionCount: a.questionCount,
      passingScore: a.passingScore,
      maxAttempts: a.maxAttempts,
      timeLimitMin: a.timeLimitMin,
      showResults: a.showResults,
    },
    attempts: attempts.map((t) => ({
      id: t.id,
      attemptNo: t.attemptNo,
      status: (t.status === "in_progress" && isPastDeadline(a, t.startedAt)
        ? "expired"
        : t.status) as AttemptStatus,
      score: t.status === "in_progress" ? null : t.score,
      passed: t.passed,
      submittedAt: t.submittedAt?.getTime() ?? null,
      pendingGrade: a.kind === "assignment" && t.status === "submitted" && t.gradedAt == null,
    })),
    activeAttemptId: open?.id ?? null,
    canAttempt: !open && attempts.length < a.maxAttempts,
    // every started attempt consumes a slot — matches listMyAssessments' used count
    attemptsUsed: attempts.length,
  };
}

/** Start a new attempt — or resume the live one (idempotent POST). */
export function startAttempt(userId: number, assessmentId: number) {
  return db.transaction((tx) => {
    const a = gate(userId, assessmentId);
    finalizeExpired(tx, userId, assessmentId, a);

    const open = tx
      .select()
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.userId, userId),
          eq(assessmentAttempts.assessmentId, assessmentId),
          eq(assessmentAttempts.status, "in_progress")
        )
      )
      .all()[0];
    if (open) {
      return {
        resumed: true,
        attemptId: open.id,
        attemptNo: open.attemptNo,
        deadline: deadlineOf(a, open.startedAt),
        questions: questionsFor(assessmentId, parseIdxs(open.questionIds)).map(questionPayload),
      };
    }

    const [{ used }] = tx
      .select({ used: sql<number>`count(*)` })
      .from(assessmentAttempts)
      .where(
        and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.assessmentId, assessmentId))
      )
      .all();
    if (used >= a.maxAttempts) throw new DomainError(409, "No attempts remaining");

    const all = questionsFor(assessmentId);
    if (a.kind !== "assignment" && !all.length)
      throw new DomainError(409, "Assessment has no questions");
    const order = a.shuffleQuestions
      ? [...all].sort(() => Math.random() - 0.5).map((q) => q.id)
      : all.map((q) => q.id);

    const [{ maxNo }] = tx
      .select({ maxNo: max(assessmentAttempts.attemptNo) })
      .from(assessmentAttempts)
      .where(
        and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.assessmentId, assessmentId))
      )
      .all();
    const now = new Date();
    const [attempt] = tx
      .insert(assessmentAttempts)
      .values({
        assessmentId,
        userId,
        attemptNo: (maxNo ?? 0) + 1,
        status: "in_progress",
        startedAt: now,
        questionIds: JSON.stringify(order),
      })
      .returning()
      .all();
    const byId = new Map(all.map((q) => [q.id, q]));
    return {
      resumed: false,
      attemptId: attempt.id,
      attemptNo: attempt.attemptNo,
      deadline: now.getTime() + a.timeLimitMin * 60_000,
      questions: order
        .map((id) => byId.get(id))
        .filter((q): q is QuestionRow => !!q)
        .map(questionPayload),
    };
  });
}

/** Submit an in-progress attempt — quiz/exam score server-side; assignments
 *  store the submission text and await an admin grade. */
export function submitAttempt(
  userId: number,
  attemptId: number,
  input: { answers?: Record<number, number[]>; submission?: string }
) {
  return db.transaction((tx) => {
    const row = tx
      .select({ attempt: assessmentAttempts, assessment: assessments })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId)))
      .all()[0];
    if (!row) throw new DomainError(404, "Attempt not found");
    const { attempt, assessment } = row;

    if (attempt.status === "submitted") {
      return buildResult(tx, attempt, assessment); // idempotent re-submit
    }
    if (attempt.status !== "in_progress") throw new DomainError(409, "Attempt closed");
    if (isPastDeadline(assessment, attempt.startedAt)) {
      tx.update(assessmentAttempts)
        .set({ status: "expired" })
        .where(eq(assessmentAttempts.id, attemptId))
        .run();
      refreshAssessmentCounters(tx, [assessment.id]);
      throw new DomainError(409, "Time limit expired — attempt closed");
    }

    const now = new Date();
    if (assessment.kind === "assignment") {
      const submission = input.submission?.trim() ?? "";
      if (!submission) throw new DomainError(400, "Submission text is required");
      if (submission.length > 20_000) throw new DomainError(400, "Submission too long");
      tx.update(assessmentAttempts)
        .set({ status: "submitted", submission, submittedAt: now })
        .where(eq(assessmentAttempts.id, attemptId))
        .run();
      refreshAssessmentCounters(tx, [assessment.id]);
      tx.insert(activityEvents)
        .values({
          userId, type: "assignment_submitted", courseId: assessment.courseId,
          meta: JSON.stringify({ assessmentId: assessment.id }), createdAt: now,
        })
        .run();
      return buildResult(tx, { ...attempt, status: "submitted" as const, submission, submittedAt: now }, assessment);
    }

    const answers = input.answers ?? {};
    // score exactly the set that was served — live-bank edits mid-attempt must not shift scoring
    const qs = questionsFor(assessment.id, parseIdxs(attempt.questionIds));
    let earned = 0;
    let total = 0;
    for (const q of qs) {
      const selected = (answers[q.id] ?? []).filter((x) => Number.isInteger(x));
      const correctIdxs = parseIdxs(q.correct);
      const correct = selected.length > 0 && sameSet(selected, correctIdxs);
      const pts = correct ? q.points : 0;
      total += q.points;
      earned += pts;
      tx.insert(assessmentAttemptAnswers)
        .values({ attemptId, questionId: q.id, selected: JSON.stringify(selected), correct, points: pts })
        .run();
    }
    const score = total ? Math.round((100 * earned) / total) : 0;
    const passed = score >= assessment.passingScore;
    tx.update(assessmentAttempts)
      .set({ status: "submitted", score, passed, submittedAt: now })
      .where(eq(assessmentAttempts.id, attemptId))
      .run();
    refreshAssessmentCounters(tx, [assessment.id]);
    tx.insert(activityEvents)
      .values({
        userId, type: "quiz_completed", courseId: assessment.courseId,
        meta: JSON.stringify({ assessmentId: assessment.id, score }), createdAt: now,
      })
      .run();
    return buildResult(tx, { ...attempt, score, passed, submittedAt: now }, assessment);
  });
}

function buildResult(
  tx: Pick<Runner, "all">,
  attempt: typeof assessmentAttempts.$inferSelect,
  assessment: typeof assessments.$inferSelect
) {
  const base = {
    attemptId: attempt.id,
    attemptNo: attempt.attemptNo,
    status: "submitted" as const,
    score: attempt.score,
    passed: attempt.passed,
    passingScore: assessment.passingScore,
    submittedAt: attempt.submittedAt?.getTime() ?? null,
    showResults: assessment.showResults,
    review: null as null | {
      questionId: number; prompt: string; options: string[];
      correct: number[]; selected: number[]; pointsEarned: number;
    }[],
    submission: attempt.submission ?? null,
    feedback: attempt.feedback ?? null,
    gradedAt: attempt.gradedAt?.getTime() ?? null,
    pendingGrade:
      assessment.kind === "assignment" &&
      attempt.status === "submitted" &&
      attempt.gradedAt == null,
  };
  if (!assessment.showResults || assessment.kind === "assignment") return base;
  // review follows the served order (question_ids snapshot), not live bank position
  const servedOrder = parseIdxs(attempt.questionIds);
  const orderIdx = new Map(servedOrder.map((id, i) => [id, i]));
  const review = (
    tx.all(sql`
      SELECT q.id AS questionId, q.prompt, q.options, q.correct, a.selected, a.points
      FROM assessment_attempt_answers a
      JOIN assessment_questions q ON q.id = a.question_id
      WHERE a.attempt_id = ${attempt.id}`) as {
      questionId: number; prompt: string; options: string;
      correct: string; selected: string; points: number;
    }[]
  )
    .map((r) => ({
      questionId: r.questionId,
      prompt: r.prompt,
      options: JSON.parse(r.options) as string[],
      correct: parseIdxs(r.correct),
      selected: parseIdxs(r.selected),
      pointsEarned: r.points,
    }))
    .sort(
      (a, b) =>
        (orderIdx.get(a.questionId) ?? Number.MAX_SAFE_INTEGER) -
        (orderIdx.get(b.questionId) ?? Number.MAX_SAFE_INTEGER)
    );
  return { ...base, review };
}

/** Single-attempt read for the result page (submitted) or resume. */
export function getAttempt(userId: number, attemptId: number) {
  const row = db
    .select({ attempt: assessmentAttempts, assessment: assessments })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId)))
    .all()[0];
  if (!row) throw new DomainError(404, "Attempt not found");
  const { attempt, assessment } = row;
  if (attempt.status === "in_progress" && !isPastDeadline(assessment, attempt.startedAt)) {
    return {
      status: "in_progress" as const,
      attemptId: attempt.id,
      attemptNo: attempt.attemptNo,
      deadline: deadlineOf(assessment, attempt.startedAt),
      questions: questionsFor(assessment.id, parseIdxs(attempt.questionIds)).map(questionPayload),
      submission: attempt.submission ?? null,
    };
  }
  const effStatus: AttemptStatus =
    attempt.status === "in_progress" ? "expired" : (attempt.status as AttemptStatus);
  const r = buildResult(db, attempt, assessment);
  return { ...r, status: effStatus };
}

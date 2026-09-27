// Assessments write module — entity ops + question-bank ops.
// question_count derives from question rows — never written directly;
// every question mutation refreshes it in the same transaction.
// See lib/admin/lessons.ts for the module contract.
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { activityEvents, assessmentAttempts, assessmentQuestions, assessments } from "@/lib/db/schema";
import { refreshAssessmentCounters } from "@/lib/db/aggregates";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, type Actor } from "@/lib/domain";

const A = {
  created: (kind: string) => `created ${kind}`,
  updated: "updated assessment",
  deleted: "deleted assessment",
  addedQuestion: "added question",
  updatedQuestion: "updated question",
  deletedQuestion: "deleted question",
  graded: "graded submission",
} as const;

export const create = z.object({
  title: z.string().min(1).max(200),
  kind: z.enum(["quiz", "exam", "assignment"]).default("quiz"),
  courseId: z.number().int().positive().nullish(),
  // questionCount derives from assessment_questions — managed via question ops
  passingScore: z.number().int().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).default(1),
  timeLimitMin: z.number().int().min(1).default(30),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
});

export const patch = create
  .omit({ kind: true })
  .extend({ status: z.enum(["draft", "published", "archived"]) })
  .partial();

export type AssessmentCreate = z.infer<typeof create>;
export type AssessmentPatch = z.infer<typeof patch>;

export const questionBase = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(["single", "multi", "tf"]),
  options: z.array(z.string().min(1)).min(2).max(10),
  correct: z.array(z.number().int().min(0)).min(1),
  points: z.number().int().min(1).default(1),
  position: z.number().int().min(0).optional(),
});

export const questionCreate = questionBase
  .refine((q) => q.correct.every((i) => i < q.options.length), {
    message: "correct index out of range",
  })
  .refine((q) => q.type === "multi" || q.correct.length === 1, {
    message: "single/tf questions take exactly one correct option",
  });

export const questionPatch = questionBase.partial();

export type QuestionCreate = z.infer<typeof questionCreate>;
export type QuestionPatch = z.infer<typeof questionPatch>;

async function createAssessment(me: Actor, _params: Record<string, never>, input: AssessmentCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx
      .insert(assessments)
      .values({ ...input, status: "draft", createdAt: new Date() })
      .returning()
      .all();
    auditTx(tx, me, { action: A.created(row.kind), targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments" }, ip);
    return row;
  });
}

async function updateAssessment(me: Actor, params: { id: number }, input: AssessmentPatch) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx.update(assessments).set(input).where(eq(assessments.id, params.id)).returning().all();
    if (!row) throw new DomainError(404, "Assessment not found");
    auditTx(tx, me, { action: A.updated, targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments", details: { changes: input } }, ip);
    return row;
  });
}

async function removeAssessment(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx.delete(assessments).where(eq(assessments.id, params.id)).returning().all();
    if (!row) throw new DomainError(404, "Assessment not found");
    auditTx(tx, me, { action: A.deleted, targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments" }, ip);
    return { deleted: true as const };
  });
}

function assessmentTitle(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: number) {
  return tx.select({ title: assessments.title }).from(assessments).where(eq(assessments.id, id)).all()[0]?.title;
}

async function addQuestion(me: Actor, params: { id: number }, input: QuestionCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const title = assessmentTitle(tx, params.id);
    if (title === undefined) throw new DomainError(404, "Assessment not found");
    const [{ maxPos }] = tx
      .select({ maxPos: max(assessmentQuestions.position) })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, params.id))
      .all();
    const [created] = tx
      .insert(assessmentQuestions)
      .values({
        assessmentId: params.id,
        position: input.position ?? (maxPos ?? -1) + 1,
        prompt: input.prompt,
        type: input.type,
        options: JSON.stringify(input.options),
        correct: JSON.stringify(input.correct),
        points: input.points,
      })
      .returning()
      .all();
    refreshAssessmentCounters(tx, [params.id]);
    auditTx(tx, me, { action: A.addedQuestion, targetType: "assessment", targetId: params.id, targetLabel: title, module: "assessments" }, ip);
    return { ...created, options: input.options, correct: input.correct };
  });
}

async function updateQuestion(
  me: Actor,
  params: { id: number; questionId: number },
  input: QuestionPatch
) {
  if (Object.values(input).every((v) => v === undefined))
    throw new DomainError(400, "Nothing to update");
  const ip = await clientIp();
  return db.transaction((tx) => {
    const existing = tx
      .select()
      .from(assessmentQuestions)
      .where(and(eq(assessmentQuestions.id, params.questionId), eq(assessmentQuestions.assessmentId, params.id)))
      .all()[0];
    if (!existing) throw new DomainError(404, "Question not found");

    // validate the merged result — cross-field rules hold on the final state
    const merged = {
      prompt: input.prompt ?? existing.prompt,
      type: input.type ?? (existing.type as "single" | "multi" | "tf"),
      options: input.options ?? (JSON.parse(existing.options) as string[]),
      correct: input.correct ?? (JSON.parse(existing.correct) as number[]),
      points: input.points ?? existing.points,
      position: input.position ?? existing.position,
    };
    if (!questionCreate.safeParse(merged).success)
      throw new DomainError(400, "Question violates type/options constraints");

    const [row] = tx
      .update(assessmentQuestions)
      .set({ ...merged, options: JSON.stringify(merged.options), correct: JSON.stringify(merged.correct) })
      .where(eq(assessmentQuestions.id, existing.id))
      .returning()
      .all();
    refreshAssessmentCounters(tx, [params.id]);
    auditTx(tx, me, {
      action: A.updatedQuestion,
      targetType: "assessment",
      targetId: params.id,
      targetLabel: assessmentTitle(tx, params.id) ?? `#${params.id}`,
      module: "assessments",
      details: { changes: input },
    }, ip);
    return { ...row, options: JSON.parse(row.options), correct: JSON.parse(row.correct) };
  });
}

async function removeQuestion(me: Actor, params: { id: number; questionId: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx
      .delete(assessmentQuestions)
      .where(and(eq(assessmentQuestions.id, params.questionId), eq(assessmentQuestions.assessmentId, params.id)))
      .returning()
      .all();
    if (!row) throw new DomainError(404, "Question not found");
    refreshAssessmentCounters(tx, [params.id]);
    auditTx(tx, me, {
      action: A.deletedQuestion,
      targetType: "assessment",
      targetId: params.id,
      targetLabel: assessmentTitle(tx, params.id) ?? `#${params.id}`,
      module: "assessments",
    }, ip);
    return { deleted: true as const };
  });
}

export const grade = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().max(2000).optional(),
});
export type GradeInput = z.infer<typeof grade>;

/** Grade a submitted assignment attempt — score/passed + feedback, metrics
 *  count the attempt from this point on. Re-grading is allowed (overwrites). */
async function gradeAttempt(me: Actor, params: { id: number }, input: GradeInput) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const row = tx
      .select({ attempt: assessmentAttempts, assessment: assessments })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .where(eq(assessmentAttempts.id, params.id))
      .all()[0];
    if (!row) throw new DomainError(404, "Attempt not found");
    const { attempt, assessment } = row;
    if (assessment.kind !== "assignment")
      throw new DomainError(409, "Only assignment attempts are graded");
    if (attempt.status !== "submitted")
      throw new DomainError(409, "Attempt is not submitted");
    const now = new Date();
    const passed = input.score >= assessment.passingScore;
    const [updated] = tx
      .update(assessmentAttempts)
      .set({
        score: input.score,
        passed,
        feedback: input.feedback ?? null,
        gradedAt: now,
        gradedBy: me.id,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning()
      .all();
    refreshAssessmentCounters(tx, [assessment.id]);
    tx.insert(activityEvents)
      .values({
        userId: attempt.userId,
        type: "assignment_graded",
        courseId: assessment.courseId,
        meta: JSON.stringify({ assessmentId: assessment.id, score: input.score }),
        createdAt: now,
      })
      .run();
    auditTx(tx, me, {
      action: A.graded, targetType: "assessment", targetId: assessment.id,
      targetLabel: assessment.title, module: "assessments",
      details: { attemptId: attempt.id, score: input.score },
    }, ip);
    return updated;
  });
}

export const write = {
  create: { schema: create, run: createAssessment },
  update: { schema: patch, run: updateAssessment },
  remove: { run: removeAssessment },
  questions: {
    create: { schema: questionCreate, run: addQuestion },
    update: { schema: questionPatch, run: updateQuestion },
    remove: { run: removeQuestion },
  },
  attempts: {
    grade: { schema: grade, run: gradeAttempt },
  },
};

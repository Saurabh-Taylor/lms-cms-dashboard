// Lessons write module — semantic operations. Each op owns its transaction,
// derived-state consequences (via lib/db/derived), audit, and error modes.
// Routes are one-line verb() adapters; they never see the refresh ordering.
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { lessons, sections } from "@/lib/db/schema";
import { refreshCourseCounters } from "@/lib/db/aggregates";
import { lessonSetChanged } from "@/lib/db/derived";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, type Actor } from "@/lib/domain";

const A = {
  created: "created chapter",
  updated: "updated chapter",
  published: "published chapter",
  unpublished: "unpublished chapter",
  deleted: "deleted chapter",
  duplicated: "duplicated chapter",
} as const;

export const create = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["text", "video", "pdf", "link", "code", "quiz", "assignment"]).default("text"),
});

export const patch = z.object({
  title: z.string().min(1).max(200).optional(),
  type: create.shape.type.optional(),
  durationMin: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published"]).optional(),
  blocks: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type LessonCreate = z.infer<typeof create>;
export type LessonPatch = z.infer<typeof patch>;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function withCourse(tx: Tx, lessonId: number) {
  return tx
    .select({ lesson: lessons, courseId: sections.courseId })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(eq(lessons.id, lessonId))
    .all()[0];
}

async function createLesson(me: Actor, params: { id: number }, input: LessonCreate) {
  const ip = await clientIp();
  const row = db.transaction((tx) => {
    const sec = tx.select().from(sections).where(eq(sections.id, params.id)).all()[0];
    if (!sec) throw new DomainError(404, "Section not found");
    const [{ max: maxPos }] = tx
      .select({ max: max(lessons.position) })
      .from(lessons)
      .where(eq(lessons.sectionId, sec.id))
      .all();
    const [lesson] = tx
      .insert(lessons)
      .values({
        sectionId: sec.id,
        title: input.title,
        type: input.type,
        position: (maxPos ?? -1) + 1,
        status: "draft",
        blocks: "[]",
      })
      .returning()
      .all();
    refreshCourseCounters(tx, [sec.courseId]); // draft: count only, published set untouched
    auditTx(tx, me, { action: A.created, targetType: "lesson", targetId: lesson.id, targetLabel: lesson.title, module: "courses", details: { courseId: sec.courseId } }, ip);
    return lesson;
  });
  return row;
}

async function updateLesson(me: Actor, params: { id: number }, input: LessonPatch) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const l = withCourse(tx, params.id);
    if (!l) throw new DomainError(404, "Chapter not found");
    const { blocks, ...rest } = input;
    const flipped = input.status !== undefined && input.status !== l.lesson.status;
    const [row] = tx
      .update(lessons)
      .set({ ...rest, ...(blocks ? { blocks: JSON.stringify(blocks) } : {}) })
      .where(eq(lessons.id, l.lesson.id))
      .returning()
      .all();
    if (flipped) lessonSetChanged(tx, l.courseId); // published set moved
    auditTx(tx, me, {
      action: flipped ? (input.status === "published" ? A.published : A.unpublished) : A.updated,
      targetType: "lesson", targetId: row.id, targetLabel: row.title,
      module: "courses", details: { changes: input },
    }, ip);
    return row;
  });
}

async function removeLesson(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const l = withCourse(tx, params.id);
    if (!l) throw new DomainError(404, "Chapter not found");
    tx.delete(lessons).where(eq(lessons.id, l.lesson.id)).run();
    lessonSetChanged(tx, l.courseId);
    auditTx(tx, me, { action: A.deleted, targetType: "lesson", targetId: l.lesson.id, targetLabel: l.lesson.title, module: "courses" }, ip);
    return { deleted: true as const };
  });
}

async function duplicateLesson(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const src = withCourse(tx, params.id);
    if (!src) throw new DomainError(404, "Chapter not found");
    const [{ maxPos }] = tx
      .select({ maxPos: max(lessons.position) })
      .from(lessons)
      .where(eq(lessons.sectionId, src.lesson.sectionId))
      .all();
    const [copy] = tx
      .insert(lessons)
      .values({
        ...src.lesson,
        id: undefined,
        title: `${src.lesson.title} (Copy)`,
        status: "draft",
        position: (maxPos ?? -1) + 1,
      })
      .returning()
      .all();
    refreshCourseCounters(tx, [src.courseId]);
    auditTx(tx, me, { action: A.duplicated, targetType: "lesson", targetId: copy.id, targetLabel: copy.title, module: "courses" }, ip);
    return copy;
  });
}

export const write = {
  create: { schema: create, run: createLesson },
  update: { schema: patch, run: updateLesson },
  remove: { run: removeLesson },
  duplicate: { run: duplicateLesson },
};

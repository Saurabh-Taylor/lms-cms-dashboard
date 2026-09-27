// Sections write module — see lib/admin/lessons.ts for the contract.
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, sections } from "@/lib/db/schema";
import { lessonSetChanged } from "@/lib/db/derived";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, type Actor } from "@/lib/domain";

const A = {
  created: "created section",
  renamed: "renamed section",
  deleted: "deleted section",
} as const;

export const create = z.object({ title: z.string().min(1).max(200) });
export const patch = create.partial();
export type SectionCreate = z.infer<typeof create>;
export type SectionPatch = z.infer<typeof patch>;

async function createSection(me: Actor, params: { id: number }, input: SectionCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const course = tx.select({ id: courses.id }).from(courses)
      .where(eq(courses.id, params.id)).all()[0];
    if (!course) throw new DomainError(404, "Course not found");
    const [{ maxPos }] = tx
      .select({ maxPos: max(sections.position) })
      .from(sections)
      .where(eq(sections.courseId, params.id))
      .all();
    const [row] = tx
      .insert(sections)
      .values({ courseId: params.id, title: input.title, position: (maxPos ?? -1) + 1 })
      .returning()
      .all();
    auditTx(tx, me, { action: A.created, targetType: "section", targetId: row.id, targetLabel: row.title, module: "courses" }, ip);
    return { ...row, lessons: [] as never[] };
  });
}

async function renameSection(me: Actor, params: { id: number }, input: SectionPatch) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx.update(sections).set(input).where(eq(sections.id, params.id)).returning().all();
    if (!row) throw new DomainError(404, "Section not found");
    auditTx(tx, me, { action: A.renamed, targetType: "section", targetId: row.id, targetLabel: row.title, module: "courses" }, ip);
    return row;
  });
}

async function removeSection(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const section = tx.select().from(sections).where(eq(sections.id, params.id)).all()[0];
    if (!section) throw new DomainError(404, "Section not found");
    // cascade removes lessons — the published set may have shrunk
    tx.delete(sections).where(eq(sections.id, params.id)).run();
    lessonSetChanged(tx, section.courseId);
    auditTx(tx, me, { action: A.deleted, targetType: "section", targetId: section.id, targetLabel: section.title, module: "courses" }, ip);
    return { deleted: true as const };
  });
}

export const write = {
  create: { schema: create, run: createSection },
  update: { schema: patch, run: renameSection },
  remove: { run: removeSection },
};

// Courses write module — see lib/admin/lessons.ts for the contract.
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, enrollments, lessons, sections } from "@/lib/db/schema";
import { refreshCourseCounters, refreshUserCounters } from "@/lib/db/aggregates";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, requireCap, type Actor } from "@/lib/domain";
import { slugify } from "@/lib/api/helpers";
import { PERM } from "@/lib/permissions";

const A = {
  created: "created course",
  updated: "updated course",
  published: "published course",
  archived: "archived course",
  deleted: "deleted course",
  duplicated: "duplicated course",
} as const;

export const create = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(200).optional(),
  description: z.string().max(2000).nullish(),
  categoryId: z.number().int().positive().nullish(),
  instructorId: z.number().int().positive().nullish(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  estimatedMinutes: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  certificateEnabled: z.boolean().default(false),
});

export const patch = create
  .omit({ slug: true })
  .extend({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(200).optional(),
    description: z.string().max(5000).nullish(),
    status: z.enum(["draft", "published", "archived"]),
  })
  .partial();

export type CourseCreate = z.infer<typeof create>;
export type CoursePatch = z.infer<typeof patch>;

async function createCourse(me: Actor, _params: Record<string, never>, input: CourseCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const slug = input.slug || slugify(input.title);
    const exists = tx.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).all();
    if (exists.length) throw new DomainError(409, "Slug already in use");
    const now = new Date();
    const [row] = tx
      .insert(courses)
      .values({ ...input, slug, tags: JSON.stringify(input.tags), status: "draft", createdAt: now, updatedAt: now })
      .returning()
      .all();
    auditTx(tx, me, { action: A.created, targetType: "course", targetId: row.id, targetLabel: row.title, module: "courses" }, ip);
    return row;
  });
}

async function updateCourse(me: Actor, params: { id: number }, input: CoursePatch) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    // Publishing is gated separately from editing — instructors edit, can't publish.
    if (input.status === "published") requireCap(me, PERM.coursePublish);
    const { tags, ...rest } = input;
    const [row] = tx
      .update(courses)
      .set({ ...rest, ...(tags ? { tags: JSON.stringify(tags) } : {}), updatedAt: new Date() })
      .where(eq(courses.id, params.id))
      .returning()
      .all();
    if (!row) throw new DomainError(404, "Course not found");
    const action =
      input.status === "published" ? A.published
      : input.status === "archived" ? A.archived
      : A.updated;
    auditTx(tx, me, { action, targetType: "course", targetId: row.id, targetLabel: row.title, module: "courses", details: { changes: input } }, ip);
    return row;
  });
}

async function removeCourse(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    // enrollments cascade — resolve affected users BEFORE the delete
    const affected = tx
      .select({ userId: enrollments.userId })
      .from(enrollments)
      .where(eq(enrollments.courseId, params.id))
      .all();
    const course = tx.select().from(courses).where(eq(courses.id, params.id)).all()[0];
    if (!course) throw new DomainError(404, "Course not found");
    tx.delete(courses).where(eq(courses.id, params.id)).run();
    refreshUserCounters(tx, affected.map((r) => r.userId));
    auditTx(tx, me, { action: A.deleted, targetType: "course", targetId: course.id, targetLabel: course.title, module: "courses" }, ip);
    return { deleted: true as const };
  });
}

async function duplicateCourse(me: Actor, params: { id: number }) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const src = tx.select().from(courses).where(eq(courses.id, params.id)).all()[0];
    if (!src) throw new DomainError(404, "Course not found");
    const now = new Date();
    const [copy] = tx
      .insert(courses)
      .values({
        ...src,
        id: undefined,
        title: `${src.title} (Copy)`,
        slug: `${src.slug}-copy-${Date.now().toString(36)}`,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .all();
    const srcSections = tx.select().from(sections)
      .where(eq(sections.courseId, src.id)).orderBy(asc(sections.position)).all();
    for (const sec of srcSections) {
      const [newSec] = tx
        .insert(sections)
        .values({ courseId: copy.id, title: sec.title, position: sec.position })
        .returning()
        .all();
      const srcLessons = tx.select().from(lessons)
        .where(eq(lessons.sectionId, sec.id)).orderBy(asc(lessons.position)).all();
      if (srcLessons.length)
        tx.insert(lessons).values(srcLessons.map((l) => ({ ...l, id: undefined, sectionId: newSec.id }))).run();
    }
    refreshCourseCounters(tx, [copy.id]); // reset copied counters — enrollments aren't copied
    auditTx(tx, me, { action: A.duplicated, targetType: "course", targetId: copy.id, targetLabel: copy.title, module: "courses", details: { sourceId: src.id } }, ip);
    return copy;
  });
}

export const write = {
  create: { schema: create, run: createCourse },
  update: { schema: patch, run: updateCourse },
  remove: { run: removeCourse },
  duplicate: { run: duplicateCourse },
};

import { and, count, eq, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, courses, users } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy, slugify } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  title: courses.title,
  status: courses.status,
  enrollmentCount: courses.enrollmentCount,
  completionRate: courses.completionRate,
  avgProgress: courses.avgProgress,
  lessonCount: courses.lessonCount,
  updatedAt: courses.updatedAt,
  createdAt: courses.createdAt,
} as const;

const shape = {
  id: courses.id,
  title: courses.title,
  slug: courses.slug,
  description: courses.description,
  categoryId: courses.categoryId,
  categoryName: categories.name,
  instructorId: courses.instructorId,
  instructorName: users.name,
  difficulty: courses.difficulty,
  status: courses.status,
  visibility: courses.visibility,
  estimatedMinutes: courses.estimatedMinutes,
  tags: courses.tags,
  thumbnailColor: courses.thumbnailColor,
  certificateEnabled: courses.certificateEnabled,
  enrollmentCount: courses.enrollmentCount,
  completionRate: courses.completionRate,
  avgProgress: courses.avgProgress,
  lessonCount: courses.lessonCount,
  createdAt: courses.createdAt,
  updatedAt: courses.updatedAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];

  const status = lq.sp.get("status");
  if (status) conds.push(eq(courses.status, status as "draft" | "published" | "archived"));
  const categoryId = lq.sp.get("categoryId");
  if (categoryId) conds.push(eq(courses.categoryId, Number(categoryId)));
  const instructorId = lq.sp.get("instructorId");
  if (instructorId) conds.push(eq(courses.instructorId, Number(instructorId)));
  const difficulty = lq.sp.get("difficulty");
  if (difficulty) conds.push(eq(courses.difficulty, difficulty as "beginner"));
  const visibility = lq.sp.get("visibility");
  if (visibility) conds.push(eq(courses.visibility, visibility as "public"));
  if (lq.q) conds.push(like(courses.title, likePattern(lq.q)));

  const where = and(...conds);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(shape)
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "updatedAt"))
      .limit(lq.pageSize)
      .offset(lq.offset),
    db.select({ total: count() }).from(courses).where(where),
  ]);
  return listOk(rows, total, lq);
}

const createSchema = z.object({
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

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid body");
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const exists = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug));
  if (exists.length) return fail(409, "Slug already in use");

  const now = new Date();
  const [row] = await db
    .insert(courses)
    .values({
      ...parsed.data,
      slug,
      tags: JSON.stringify(parsed.data.tags),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  audit({ action: "created course", targetType: "course", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok(row, { status: 201 });
}

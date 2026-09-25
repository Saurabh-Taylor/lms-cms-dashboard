import { and, count, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { learningPaths } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy, slugify } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";
import { eq } from "drizzle-orm";

const sortMap = {
  title: learningPaths.title,
  status: learningPaths.status,
  createdAt: learningPaths.createdAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const status = lq.sp.get("status");
  if (status) conds.push(eq(learningPaths.status, status as "draft"));
  if (lq.q) conds.push(like(learningPaths.title, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(learningPaths).where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(learningPaths).where(where),
  ]);
  return listOk(
    rows.map((r) => ({ ...r, courseCount: (JSON.parse(r.courseIds) as number[]).length })),
    total, lq
  );
}

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  courseIds: z.array(z.number().int().positive()).default([]),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Title required");
  const [row] = await db.insert(learningPaths).values({
    title: parsed.data.title,
    slug: slugify(parsed.data.title) + `-${Date.now().toString(36)}`,
    description: parsed.data.description ?? null,
    courseIds: JSON.stringify(parsed.data.courseIds),
    status: "draft",
    createdAt: new Date(),
  }).returning();
  audit({ action: "created learning path", targetType: "learning_path", targetId: row.id, targetLabel: row.title, module: "learning-paths" });
  return ok(row, { status: 201 });
}

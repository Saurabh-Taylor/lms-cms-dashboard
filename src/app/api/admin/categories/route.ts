import { and, count, like, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, courses } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy, slugify } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const courseCountExpr = sql<number>`(SELECT COUNT(*) FROM ${courses} WHERE ${courses.categoryId} = ${categories.id})`;

const sortMap = {
  name: categories.name,
  courseCount: courseCountExpr,
  createdAt: categories.createdAt,
};

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  if (lq.q) conds.push(like(categories.name, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: categories.id, name: categories.name, slug: categories.slug,
        description: categories.description, createdAt: categories.createdAt,
        courseCount: courseCountExpr,
      })
      .from(categories)
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "name"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(categories).where(where),
  ]);
  return listOk(rows, total, lq);
}

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullish(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Name required");
  const [row] = await db.insert(categories).values({
    ...parsed.data,
    slug: slugify(parsed.data.name) + `-${Date.now().toString(36)}`,
    createdAt: new Date(),
  }).returning();
  audit({ action: "created category", targetType: "category", targetId: row.id, targetLabel: row.name, module: "categories" });
  return ok(row, { status: 201 });
}

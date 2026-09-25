import { and, count, eq, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, labs } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  name: labs.name,
  status: labs.status,
  type: labs.type,
  durationMin: labs.durationMin,
  assignedCount: labs.assignedCount,
  createdAt: labs.createdAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const status = lq.sp.get("status");
  if (status) conds.push(eq(labs.status, status as "active"));
  const type = lq.sp.get("type");
  if (type) conds.push(eq(labs.type, type as "vm"));
  const categoryId = lq.sp.get("categoryId");
  if (categoryId) conds.push(eq(labs.categoryId, Number(categoryId)));
  if (lq.q) conds.push(like(labs.name, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: labs.id, name: labs.name, type: labs.type,
        categoryId: labs.categoryId, categoryName: categories.name,
        description: labs.description, durationMin: labs.durationMin,
        resourceTier: labs.resourceTier, status: labs.status,
        assignedCount: labs.assignedCount, createdAt: labs.createdAt,
      })
      .from(labs)
      .leftJoin(categories, eq(labs.categoryId, categories.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(labs).where(where),
  ]);
  return listOk(rows, total, lq);
}

const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["vm", "container", "jupyter", "cloud-sandbox"]).default("container"),
  categoryId: z.number().int().positive().nullish(),
  description: z.string().max(2000).nullish(),
  durationMin: z.number().int().min(5).default(60),
  resourceTier: z.enum(["small", "medium", "large"]).default("small"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid lab payload");
  const [row] = await db.insert(labs).values({ ...parsed.data, createdAt: new Date() }).returning();
  audit({ action: "created lab", targetType: "lab", targetId: row.id, targetLabel: row.name, module: "labs" });
  return ok(row, { status: 201 });
}

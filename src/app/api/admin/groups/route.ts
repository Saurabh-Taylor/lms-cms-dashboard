import { and, count, like, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { groupMembers, groups } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const memberCountExpr = sql<number>`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${groups.id})`;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  if (lq.q) conds.push(like(groups.name, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: groups.id, name: groups.name, description: groups.description,
        createdAt: groups.createdAt,
        memberCount: memberCountExpr,
      })
      .from(groups)
      .where(where)
      .orderBy(orderBy({ name: groups.name, createdAt: groups.createdAt, memberCount: memberCountExpr }, lq.sort, lq.order, "name"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(groups).where(where),
  ]);
  return listOk(rows, total, lq);
}

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullish(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Name required");
  const [row] = await db.insert(groups).values({ ...parsed.data, createdAt: new Date() }).returning();
  audit({ action: "created cohort", targetType: "group", targetId: row.id, targetLabel: row.name, module: "groups" });
  return ok(row, { status: 201 });
}

import { and, count, eq, gte, lte, or, like, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy } from "@/lib/api/helpers";

const sortMap = {
  createdAt: auditLogs.createdAt,
  actorName: auditLogs.actorName,
  module: auditLogs.module,
  action: auditLogs.action,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const module_ = lq.sp.get("module");
  if (module_) conds.push(eq(auditLogs.module, module_));
  const actorId = lq.sp.get("actorId");
  if (actorId) conds.push(eq(auditLogs.actorId, Number(actorId)));
  const targetType = lq.sp.get("targetType");
  if (targetType) conds.push(eq(auditLogs.targetType, targetType));
  const from = lq.sp.get("from");
  if (from) conds.push(gte(auditLogs.createdAt, new Date(Number(from))));
  const range = lq.sp.get("range");
  if (range) conds.push(gte(auditLogs.createdAt, new Date(Date.now() - Number(range) * 86400000)));
  const to = lq.sp.get("to");
  if (to) conds.push(lte(auditLogs.createdAt, new Date(Number(to))));
  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(auditLogs.actorName, p), like(auditLogs.action, p), like(auditLogs.targetLabel, p))!);
  }
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(auditLogs).where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);
  return listOk(rows, total, lq);
}

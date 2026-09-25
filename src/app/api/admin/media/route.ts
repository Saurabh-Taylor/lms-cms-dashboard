import { and, count, eq, like, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mediaAssets, users } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy } from "@/lib/api/helpers";

const sortMap = {
  name: mediaAssets.name,
  sizeKb: mediaAssets.sizeKb,
  createdAt: mediaAssets.createdAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const type = lq.sp.get("type");
  if (type) conds.push(eq(mediaAssets.type, type as "image"));
  if (lq.q) conds.push(like(mediaAssets.name, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: mediaAssets.id, name: mediaAssets.name, type: mediaAssets.type,
        sizeKb: mediaAssets.sizeKb, uploadedByName: users.name, createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .leftJoin(users, eq(mediaAssets.uploadedById, users.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(mediaAssets).where(where),
  ]);
  return listOk(rows, total, lq);
}

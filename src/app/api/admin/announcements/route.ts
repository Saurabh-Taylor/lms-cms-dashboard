import { and, count, eq, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const status = lq.sp.get("status");
  if (status) conds.push(eq(announcements.status, status as "draft"));
  const audience = lq.sp.get("audience");
  if (audience) conds.push(eq(announcements.audience, audience as "all"));
  if (lq.q) conds.push(like(announcements.title, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(announcements).where(where)
      .orderBy(orderBy({ createdAt: announcements.createdAt, title: announcements.title }, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(announcements).where(where),
  ]);
  return listOk(rows, total, lq);
}

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(["all", "learners", "instructors", "admins"]).default("all"),
  status: z.enum(["draft", "scheduled", "sent"]).default("draft"),
  scheduledAt: z.number().int().nullish(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid announcement");
  const [row] = await db.insert(announcements).values({
    ...parsed.data,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    createdAt: new Date(),
  }).returning();
  audit({ action: row.status === "sent" ? "sent announcement" : "created announcement", targetType: "announcement", targetId: row.id, targetLabel: row.title, module: "announcements" });
  return ok(row, { status: 201 });
}

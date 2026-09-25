import { and, count, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { groupMembers, users } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy, fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  name: users.name,
  email: users.email,
  status: users.status,
  enrolledCount: users.enrolledCount,
  avgProgress: users.avgProgress,
  lastActiveAt: users.lastActiveAt,
  createdAt: users.createdAt,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];

  const role = lq.sp.get("role");
  if (role) conds.push(eq(users.role, role as "learner" | "instructor" | "admin"));
  const status = lq.sp.get("status");
  if (status) conds.push(eq(users.status, status as "active" | "suspended" | "invited"));

  const cohort = lq.sp.get("cohortId");
  if (cohort)
    conds.push(
      sql`${users.id} IN (SELECT user_id FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${Number(cohort)})`
    );

  const from = lq.sp.get("createdFrom");
  if (from) conds.push(gte(users.createdAt, new Date(Number(from))));
  const to = lq.sp.get("createdTo");
  if (to) conds.push(lte(users.createdAt, new Date(Number(to))));

  const activeWithin = lq.sp.get("activeWithinDays");
  if (activeWithin)
    conds.push(gte(users.lastActiveAt, new Date(Date.now() - Number(activeWithin) * 86400000)));

  const courseId = lq.sp.get("courseId");
  if (courseId)
    conds.push(
      sql`${users.id} IN (SELECT user_id FROM enrollments WHERE course_id = ${Number(courseId)})`
    );

  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(users.name, p), like(users.email, p))!);
  }

  const where = and(...conds);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize)
      .offset(lq.offset),
    db.select({ total: count() }).from(users).where(where),
  ]);
  return listOk(rows.map(stripLabsCount), total, lq);
}

/** Retained denormalized column — labs data stays in the DB but leaves the API surface. */
function stripLabsCount<T extends { labsCount: number }>(u: T) {
  const { labsCount, ...rest } = u;
  void labsCount;
  return rest;
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["learner", "instructor", "admin"]).default("learner"),
  title: z.string().max(120).nullish(),
});

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid body");
  const exists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email));
  if (exists.length) return fail(409, "A user with this email already exists");

  const [row] = await db
    .insert(users)
    .values({ ...parsed.data, status: "invited", createdAt: new Date() })
    .returning();
  audit({
    action: `invited ${parsed.data.role}`,
    targetType: "user",
    targetId: row.id,
    targetLabel: row.name,
    module: "users",
  });
  return ok(stripLabsCount(row), { status: 201 });
}

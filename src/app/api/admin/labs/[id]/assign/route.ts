import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { labAssignments, labs, users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/labs/[id]/assign">;

const schema = z.object({
  userIds: z.array(z.number().int().positive()).min(1).max(5000),
  courseId: z.number().int().positive().nullish(),
});

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const labId = Number(id);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Provide userIds");
  const [lab] = await db.select().from(labs).where(eq(labs.id, labId));
  if (!lab) return fail(404, "Lab not found");
  if (lab.status !== "active") return fail(409, "Lab is not active");

  const valid = new Set(
    (await db.select({ id: users.id }).from(users).where(and(inArray(users.id, parsed.data.userIds), eq(users.status, "active")))).map((r) => r.id)
  );

  const results: { userId: number; ok: boolean; reason?: string }[] = [];
  const now = new Date();
  db.transaction((tx) => {
    for (const uid of parsed.data.userIds) {
      if (!valid.has(uid)) {
        results.push({ userId: uid, ok: false, reason: "User not found or inactive" });
        continue;
      }
      const dup = tx.select({ id: labAssignments.id }).from(labAssignments)
        .where(and(eq(labAssignments.labId, labId), eq(labAssignments.userId, uid))).all();
      if (dup.length) {
        results.push({ userId: uid, ok: false, reason: "Already assigned" });
        continue;
      }
      tx.insert(labAssignments).values({
        labId, userId: uid, courseId: parsed.data.courseId ?? null,
        status: "assigned", assignedAt: now,
      }).run();
      results.push({ userId: uid, ok: true });
      tx.run(sql`UPDATE users SET labs_count = (SELECT COUNT(*) FROM lab_assignments WHERE user_id = ${uid}) WHERE id = ${uid}`);
    }
    tx.run(sql`UPDATE labs SET assigned_count = (SELECT COUNT(*) FROM lab_assignments WHERE lab_id = ${labId}) WHERE id = ${labId}`);
  });

  const succeeded = results.filter((r) => r.ok).length;
  if (succeeded)
    audit({ action: `assigned lab to ${succeeded} learner(s)`, targetType: "lab", targetId: labId, targetLabel: lab.name, module: "labs", details: { succeeded, failed: results.length - succeeded } });
  return ok({ results, succeeded, failed: results.length - succeeded }, { status: 201 });
}

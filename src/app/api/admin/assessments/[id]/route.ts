import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { assessments, courses } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/assessments/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db
    .select({ assessment: assessments, courseTitle: courses.title })
    .from(assessments)
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(eq(assessments.id, Number(id)));
  if (!row) return fail(404, "Assessment not found");
  return ok({ ...row.assessment, courseTitle: row.courseTitle });
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  courseId: z.number().int().positive().nullish(),
  questionCount: z.number().int().min(0).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  timeLimitMin: z.number().int().min(1).optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid payload");
  const [row] = await db.update(assessments).set(parsed.data).where(eq(assessments.id, Number(id))).returning();
  if (!row) return fail(404, "Assessment not found");
  audit({ action: "updated assessment", targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments", details: { changes: parsed.data } });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(assessments).where(eq(assessments.id, Number(id))).returning();
  if (!row) return fail(404, "Assessment not found");
  audit({ action: "deleted assessment", targetType: "assessment", targetId: row.id, targetLabel: row.title, module: "assessments" });
  return ok({ deleted: true });
}

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assessmentQuestions } from "@/lib/db/schema";
import { ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/assessments";
import { PERM } from "@/lib/permissions";

type Ctx = RouteContext<"/api/admin/assessments/[id]/questions">;

export async function GET(_req: Request, ctx: Ctx) {
  const me = await requirePermission(PERM.assessmentView);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const rows = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, Number(id)))
    .orderBy(asc(assessmentQuestions.position));
  return ok(rows.map((r) => ({ ...r, options: JSON.parse(r.options), correct: JSON.parse(r.correct) })));
}

export const POST = verb<"/api/admin/assessments/[id]/questions">(
  PERM.assessmentUpdate,
  write.questions.create
);

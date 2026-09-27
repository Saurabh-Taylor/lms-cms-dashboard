import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/lessons";
import { PERM } from "@/lib/permissions";

type Ctx = RouteContext<"/api/admin/lessons/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const [row] = await db.select().from(lessons).where(eq(lessons.id, Number(id)));
  if (!row) return fail(404, "Chapter not found");
  return ok(row);
}

export const PATCH = verb<"/api/admin/lessons/[id]">(PERM.courseUpdate, write.update);
export const DELETE = verb<"/api/admin/lessons/[id]">(PERM.courseUpdate, write.remove);

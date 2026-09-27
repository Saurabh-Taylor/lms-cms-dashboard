import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/users";
import { PERM } from "@/lib/permissions";

type Ctx = RouteContext<"/api/admin/users/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const me = await requirePermission(PERM.learnerView);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const [row] = await db.select().from(users).where(eq(users.id, Number(id)));
  if (!row) return fail(404, "User not found");
  return ok(row);
}

export const PATCH = verb<"/api/admin/users/[id]">(PERM.learnerUpdate, write.update);

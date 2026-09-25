import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";
import { sanitizeTypography } from "@/lib/ui-preferences";

export async function GET() {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");
  return ok(me);
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  typography: z.record(z.string(), z.string()).optional(),
});

/** Learner-scoped profile updates — name + personal typography only. */
export async function PATCH(req: Request) {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid payload");

  const set: Record<string, unknown> = {};
  if (parsed.data.name) set.name = parsed.data.name;
  if (parsed.data.typography)
    set.uiPreferences = JSON.stringify({ typography: sanitizeTypography(parsed.data.typography) });
  if (!Object.keys(set).length) return fail(400, "Nothing to update");

  db.update(users).set(set).where(eq(users.id, me.id)).run();
  return ok({ saved: true });
}

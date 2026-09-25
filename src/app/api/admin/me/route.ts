import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { getCurrentAdmin } from "@/lib/me";
import { sanitizeTypography } from "@/lib/ui-preferences";

/** Current admin's profile + personal UI preferences. */
export async function GET() {
  const me = await getCurrentAdmin();
  if (!me) return fail(401, "Not signed in");
  return ok(me);
}

const patchSchema = z.object({
  typography: z.record(z.string(), z.string()),
});

export async function PATCH(req: Request) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid preferences payload");

  const overrides = sanitizeTypography(parsed.data.typography);

  const me = await getCurrentAdmin();
  if (!me) return fail(401, "Not signed in");
  db.update(users)
    .set({ uiPreferences: JSON.stringify({ typography: overrides }) })
    .where(eq(users.id, me.id))
    .run();

  return ok({ saved: true, uiPreferences: { typography: overrides } });
}

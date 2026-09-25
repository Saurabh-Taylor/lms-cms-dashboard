import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { emailTemplates } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/email-templates/[id]">;

const patchSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(10000).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid payload");
  const [row] = await db.update(emailTemplates)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(emailTemplates.id, Number(id))).returning();
  if (!row) return fail(404, "Template not found");
  audit({ action: "updated email template", targetType: "email_template", targetId: row.id, targetLabel: row.name, module: "email-templates" });
  return ok(row);
}

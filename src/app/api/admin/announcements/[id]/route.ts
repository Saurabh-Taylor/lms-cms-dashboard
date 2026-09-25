import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/announcements/[id]">;

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  audience: z.enum(["all", "learners", "instructors", "admins"]).optional(),
  status: z.enum(["draft", "scheduled", "sent"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid payload");
  const [row] = await db.update(announcements).set(parsed.data).where(eq(announcements.id, Number(id))).returning();
  if (!row) return fail(404, "Announcement not found");
  audit({ action: parsed.data.status === "sent" ? "sent announcement" : "updated announcement", targetType: "announcement", targetId: row.id, targetLabel: row.title, module: "announcements" });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(announcements).where(eq(announcements.id, Number(id))).returning();
  if (!row) return fail(404, "Announcement not found");
  audit({ action: "deleted announcement", targetType: "announcement", targetId: row.id, targetLabel: row.title, module: "announcements" });
  return ok({ deleted: true });
}

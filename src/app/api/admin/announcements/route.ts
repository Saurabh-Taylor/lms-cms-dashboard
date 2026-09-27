import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { adminList } from "@/lib/api/list";
import { audit } from "@/lib/api/audit";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.announcementView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: announcements,
    filters: (c, lq) => {
      const status = lq.sp.get("status");
      if (status) c.push(eq(announcements.status, status as "draft"));
      const audience = lq.sp.get("audience");
      if (audience) c.push(eq(announcements.audience, audience as "all"));
    },
    search: [announcements.title],
    sortMap: { createdAt: announcements.createdAt, title: announcements.title },
    defaultSort: "createdAt",
  });
}

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(["all", "learners", "instructors", "admins"]).default("all"),
  status: z.enum(["draft", "scheduled", "sent"]).default("draft"),
  scheduledAt: z.number().int().nullish(),
});

export async function POST(req: Request) {
  const me = await requirePermission(PERM.announcementCreate);
  if (me instanceof Response) return me;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid announcement");
  const [row] = await db.insert(announcements).values({
    ...parsed.data,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    createdAt: new Date(),
  }).returning();
  await audit(me, { action: row.status === "sent" ? "sent announcement" : "created announcement", targetType: "announcement", targetId: row.id, targetLabel: row.title, module: "announcements" });
  return ok(row, { status: 201 });
}

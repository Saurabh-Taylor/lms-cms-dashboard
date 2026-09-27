import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailTemplates } from "@/lib/db/schema";
import { ok } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET() {
  const me = await requirePermission(PERM.settingsView);
  if (me instanceof Response) return me;
  const rows = await db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  return ok({ data: rows });
}

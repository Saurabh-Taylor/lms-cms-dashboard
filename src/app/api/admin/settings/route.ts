import { z } from "zod";
import { db } from "@/lib/db/client";
import { platformSettings } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET() {
  const me = await requirePermission(PERM.settingsView);
  if (me instanceof Response) return me;
  const rows = await db.select().from(platformSettings);
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try { map[r.key] = JSON.parse(r.value); } catch { map[r.key] = r.value; }
  }
  return ok(map);
}

const schema = z.record(z.string(), z.unknown());

export async function PUT(req: Request) {
  const me = await requirePermission(PERM.settingsUpdate);
  if (me instanceof Response) return me;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid settings payload");
  const now = new Date();
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(parsed.data)) {
      const v = typeof value === "string" ? value : JSON.stringify(value);
      tx.insert(platformSettings)
        .values({ key, value: v, updatedAt: now })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: v, updatedAt: now } })
        .run();
    }
  });
  await audit(me, { action: "updated settings", targetType: "settings", targetLabel: `${Object.keys(parsed.data).length} keys`, module: "settings", details: { keys: Object.keys(parsed.data) } });
  return ok({ saved: true });
}

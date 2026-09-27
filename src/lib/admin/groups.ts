// Groups write module — see lib/admin/lessons.ts for the module contract.
import { z } from "zod";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema";
import { auditTx, clientIp } from "@/lib/api/audit";
import type { Actor } from "@/lib/domain";

export const create = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullish(),
});
export type GroupCreate = z.infer<typeof create>;

async function createGroup(me: Actor, _params: Record<string, never>, input: GroupCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx
      .insert(groups)
      .values({ ...input, createdAt: new Date() })
      .returning()
      .all();
    auditTx(tx, me, { action: "created cohort", targetType: "group", targetId: row.id, targetLabel: row.name, module: "groups" }, ip);
    return row;
  });
}

export const write = {
  create: { schema: create, run: createGroup },
};

// Categories write module — see lib/admin/lessons.ts for the module contract.
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { slugify } from "@/lib/api/helpers";
import { auditTx, clientIp } from "@/lib/api/audit";
import type { Actor } from "@/lib/domain";

export const create = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullish(),
});
export type CategoryCreate = z.infer<typeof create>;

async function createCategory(me: Actor, _params: Record<string, never>, input: CategoryCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx
      .insert(categories)
      .values({
        ...input,
        slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
        createdAt: new Date(),
      })
      .returning()
      .all();
    auditTx(tx, me, { action: "created category", targetType: "category", targetId: row.id, targetLabel: row.name, module: "categories" }, ip);
    return row;
  });
}

export const write = {
  create: { schema: create, run: createCategory },
};

// Learning-paths write module — see lib/admin/lessons.ts for the module contract.
import { z } from "zod";
import { db } from "@/lib/db/client";
import { learningPaths } from "@/lib/db/schema";
import { slugify } from "@/lib/api/helpers";
import { auditTx, clientIp } from "@/lib/api/audit";
import type { Actor } from "@/lib/domain";

export const create = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  courseIds: z.array(z.number().int().positive()).default([]),
});
export type LearningPathCreate = z.infer<typeof create>;

async function createPath(me: Actor, _params: Record<string, never>, input: LearningPathCreate) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const [row] = tx
      .insert(learningPaths)
      .values({
        title: input.title,
        slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
        description: input.description ?? null,
        courseIds: JSON.stringify(input.courseIds),
        status: "draft",
        createdAt: new Date(),
      })
      .returning()
      .all();
    auditTx(tx, me, { action: "created learning path", targetType: "learning_path", targetId: row.id, targetLabel: row.title, module: "learning-paths" }, ip);
    return row;
  });
}

export const write = {
  create: { schema: create, run: createPath },
};

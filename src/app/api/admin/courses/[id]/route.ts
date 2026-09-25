import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, courses, users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/courses/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db
    .select({
      course: courses,
      categoryName: categories.name,
      instructorName: users.name,
    })
    .from(courses)
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.id, Number(id)));
  if (!row) return fail(404, "Course not found");
  return ok({ ...row.course, ...row });
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(200).optional(),
  description: z.string().max(5000).nullish(),
  categoryId: z.number().int().positive().nullish(),
  instructorId: z.number().int().positive().nullish(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  visibility: z.enum(["public", "private", "unlisted"]).optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  certificateEnabled: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid body");
  const { tags, ...rest } = parsed.data;
  const [row] = await db
    .update(courses)
    .set({
      ...rest,
      ...(tags ? { tags: JSON.stringify(tags) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, Number(id)))
    .returning();
  if (!row) return fail(404, "Course not found");

  const action =
    parsed.data.status === "published"
      ? "published course"
      : parsed.data.status === "archived"
        ? "archived course"
        : "updated course";
  audit({ action, targetType: "course", targetId: row.id, targetLabel: row.title, module: "courses", details: { changes: parsed.data } });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(courses).where(eq(courses.id, Number(id))).returning();
  if (!row) return fail(404, "Course not found");
  audit({ action: "deleted course", targetType: "course", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok({ deleted: true });
}

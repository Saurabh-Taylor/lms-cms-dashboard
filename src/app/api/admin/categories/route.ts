import { sql } from "drizzle-orm";
import { categories } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/categories";
import { PERM } from "@/lib/permissions";

// correlated subquery: spell table names — drizzle renders column params unqualified
// inside sql templates and the inner table's column would win
const courseCountExpr = sql<number>`(SELECT COUNT(*) FROM courses WHERE courses.category_id = categories.id)`;

export async function GET(req: Request) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: categories,
    select: {
      id: categories.id, name: categories.name, slug: categories.slug,
      description: categories.description, createdAt: categories.createdAt,
      courseCount: courseCountExpr,
    },
    search: [categories.name],
    sortMap: {
      name: categories.name,
      courseCount: courseCountExpr,
      createdAt: categories.createdAt,
    },
    defaultSort: "name",
  });
}

export const POST = verb<"/api/admin/categories">(PERM.courseCreate, write.create);

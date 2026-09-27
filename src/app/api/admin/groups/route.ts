import { sql } from "drizzle-orm";
import { groups } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/groups";
import { PERM } from "@/lib/permissions";

// drizzle renders column params unqualified inside sql templates — a correlated
// subquery must spell out table names or the inner table's column wins ("group_id" = "id")
const memberCountExpr = sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_members.group_id = groups.id)`;

export async function GET(req: Request) {
  const me = await requirePermission(PERM.learnerView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: groups,
    select: {
      id: groups.id, name: groups.name, description: groups.description,
      createdAt: groups.createdAt,
      memberCount: memberCountExpr,
    },
    search: [groups.name],
    sortMap: { name: groups.name, createdAt: groups.createdAt, memberCount: memberCountExpr },
    defaultSort: "name",
  });
}

export const POST = verb<"/api/admin/groups">(PERM.learnerUpdate, write.create);

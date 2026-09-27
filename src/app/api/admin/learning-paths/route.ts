import { eq } from "drizzle-orm";
import { learningPaths } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/learning-paths";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: learningPaths,
    filters: (c, lq) => {
      const status = lq.sp.get("status");
      if (status) c.push(eq(learningPaths.status, status as "draft"));
    },
    search: [learningPaths.title],
    sortMap: {
      title: learningPaths.title,
      status: learningPaths.status,
      createdAt: learningPaths.createdAt,
    },
    defaultSort: "createdAt",
    map: (r) => ({ ...r, courseCount: (JSON.parse(r.courseIds) as number[]).length }),
  });
}

export const POST = verb<"/api/admin/learning-paths">(PERM.courseCreate, write.create);

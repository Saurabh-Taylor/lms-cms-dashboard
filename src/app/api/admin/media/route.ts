import { eq } from "drizzle-orm";
import { mediaAssets, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.courseView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: mediaAssets,
    select: {
      id: mediaAssets.id, name: mediaAssets.name, type: mediaAssets.type,
      sizeKb: mediaAssets.sizeKb, uploadedByName: users.name, createdAt: mediaAssets.createdAt,
    },
    join: (q) => q.leftJoin(users, eq(mediaAssets.uploadedById, users.id)),
    filters: (c, lq) => {
      const type = lq.sp.get("type");
      if (type) c.push(eq(mediaAssets.type, type as "image"));
    },
    search: [mediaAssets.name],
    sortMap: {
      name: mediaAssets.name,
      sizeKb: mediaAssets.sizeKb,
      createdAt: mediaAssets.createdAt,
    },
    defaultSort: "createdAt",
  });
}

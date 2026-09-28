import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/courses/[id]/curriculum">(
  "/api/v1/admin/courses/[id]/curriculum",
  PERM.courseView,
);
export const PUT = proxy<"/api/admin/courses/[id]/curriculum">(
  "/api/v1/admin/courses/[id]/curriculum",
  PERM.courseUpdate,
);

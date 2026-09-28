import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/courses/[id]">(
  "/api/v1/admin/courses/[id]",
  PERM.courseView,
);
export const PATCH = proxy<"/api/admin/courses/[id]">(
  "/api/v1/admin/courses/[id]",
  PERM.courseUpdate,
);
export const DELETE = proxy<"/api/admin/courses/[id]">(
  "/api/v1/admin/courses/[id]",
  PERM.courseDelete,
);

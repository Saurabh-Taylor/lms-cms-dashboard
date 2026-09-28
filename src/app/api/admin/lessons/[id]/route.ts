import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/lessons/[id]">(
  "/api/v1/admin/lessons/[id]",
  PERM.courseView,
);
export const PATCH = proxy<"/api/admin/lessons/[id]">(
  "/api/v1/admin/lessons/[id]",
  PERM.courseUpdate,
);
export const DELETE = proxy<"/api/admin/lessons/[id]">(
  "/api/v1/admin/lessons/[id]",
  PERM.courseUpdate,
);

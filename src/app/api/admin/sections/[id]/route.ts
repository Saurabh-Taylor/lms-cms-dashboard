import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/sections/[id]">(
  "/api/v1/admin/sections/[id]",
  PERM.courseUpdate,
);
export const DELETE = proxy<"/api/admin/sections/[id]">(
  "/api/v1/admin/sections/[id]",
  PERM.courseUpdate,
);

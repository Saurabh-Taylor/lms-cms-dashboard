import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const DELETE = proxy<"/api/admin/courses/[id]/thumbnail">(
  "/api/v1/admin/courses/[id]/thumbnail",
  PERM.courseUpdate,
);

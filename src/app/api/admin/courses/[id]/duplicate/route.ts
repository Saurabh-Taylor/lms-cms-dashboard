import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/courses/[id]/duplicate">(
  "/api/v1/admin/courses/[id]/duplicate",
  PERM.courseCreate,
);

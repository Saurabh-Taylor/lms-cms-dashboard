import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/lessons/[id]/duplicate">(
  "/api/v1/admin/lessons/[id]/duplicate",
  PERM.courseUpdate,
);

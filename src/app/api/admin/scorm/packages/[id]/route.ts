import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const DELETE = proxy<"/api/admin/scorm/packages/[id]">(
  "/api/v1/admin/scorm/packages/[id]",
  PERM.mediaDelete,
);

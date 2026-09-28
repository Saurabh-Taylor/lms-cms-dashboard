import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/attempts/[id]">(
  "/api/v1/admin/attempts/[id]",
  PERM.assessmentUpdate,
);

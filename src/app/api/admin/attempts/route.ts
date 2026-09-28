import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/attempts">(
  "/api/v1/admin/attempts",
  PERM.assessmentView,
);

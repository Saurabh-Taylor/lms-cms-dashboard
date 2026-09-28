import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/assessments/[id]">(
  "/api/v1/admin/assessments/[id]",
  PERM.assessmentView,
);
export const PATCH = proxy<"/api/admin/assessments/[id]">(
  "/api/v1/admin/assessments/[id]",
  PERM.assessmentUpdate,
);
export const DELETE = proxy<"/api/admin/assessments/[id]">(
  "/api/v1/admin/assessments/[id]",
  PERM.assessmentUpdate,
);

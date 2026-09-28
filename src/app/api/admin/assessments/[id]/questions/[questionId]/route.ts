import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/assessments/[id]/questions/[questionId]">(
  "/api/v1/admin/assessments/[id]/questions/[questionId]",
  PERM.assessmentUpdate,
);
export const DELETE = proxy<"/api/admin/assessments/[id]/questions/[questionId]">(
  "/api/v1/admin/assessments/[id]/questions/[questionId]",
  PERM.assessmentUpdate,
);

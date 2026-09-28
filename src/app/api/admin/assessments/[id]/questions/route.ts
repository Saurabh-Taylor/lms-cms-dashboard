import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/assessments/[id]/questions">(
  "/api/v1/admin/assessments/[id]/questions",
  PERM.assessmentView,
);
export const POST = proxy<"/api/admin/assessments/[id]/questions">(
  "/api/v1/admin/assessments/[id]/questions",
  PERM.assessmentUpdate,
);

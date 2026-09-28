import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/assessments">(
  "/api/v1/admin/assessments",
  PERM.assessmentView,
);
export const POST = proxy<"/api/admin/assessments">(
  "/api/v1/admin/assessments",
  PERM.assessmentCreate,
);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/enrollments">(
  "/api/v1/admin/enrollments",
  PERM.enrollmentView,
);

export const POST = proxy<"/api/admin/enrollments">(
  "/api/v1/admin/enrollments",
  PERM.enrollmentCreate,
);

export const PATCH = proxy<"/api/admin/enrollments">(
  "/api/v1/admin/enrollments",
  PERM.enrollmentUpdate,
);

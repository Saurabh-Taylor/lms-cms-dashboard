import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/courses">(
  "/api/v1/admin/courses",
  PERM.courseView,
);
export const POST = proxy<"/api/admin/courses">(
  "/api/v1/admin/courses",
  PERM.courseCreate,
);

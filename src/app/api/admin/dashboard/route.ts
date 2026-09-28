import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/dashboard">(
  "/api/v1/admin/dashboard",
  PERM.analyticsView,
);

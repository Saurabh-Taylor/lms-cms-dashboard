import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/analytics">(
  "/api/v1/admin/analytics",
  PERM.analyticsView,
);

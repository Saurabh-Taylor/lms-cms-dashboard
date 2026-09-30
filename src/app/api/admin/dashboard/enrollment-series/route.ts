import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/dashboard/enrollment-series">(
  "/api/v1/admin/dashboard/enrollment-series",
  PERM.analyticsView,
);

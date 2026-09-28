import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/activity">(
  "/api/v1/admin/activity",
  PERM.activityView,
);

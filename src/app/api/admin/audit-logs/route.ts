import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/audit-logs">(
  "/api/v1/admin/audit-logs",
  PERM.auditView,
);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/users/[id]/reject-request">(
  "/api/v1/admin/users/[id]/reject-request",
  PERM.learnerUpdate,
);

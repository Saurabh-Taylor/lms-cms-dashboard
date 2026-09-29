import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/users/[id]/approve-request">(
  "/api/v1/admin/users/[id]/approve-request",
  PERM.learnerUpdate,
);

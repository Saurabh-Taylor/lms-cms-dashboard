import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/users/[id]/send-password-reset">(
  "/api/v1/admin/users/[id]/send-password-reset",
  PERM.learnerUpdate,
);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/users/[id]/resend-invite">(
  "/api/v1/admin/users/[id]/resend-invite",
  PERM.learnerUpdate,
);

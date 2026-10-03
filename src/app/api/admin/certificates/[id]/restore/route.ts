import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/certificates/[id]/restore">(
  "/api/v1/admin/certificates/[id]/restore",
  PERM.certificateRevoke,
);

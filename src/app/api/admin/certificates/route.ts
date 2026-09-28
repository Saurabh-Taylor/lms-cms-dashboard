import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/certificates">(
  "/api/v1/admin/certificates",
  PERM.certificateView,
);
export const POST = proxy<"/api/admin/certificates">(
  "/api/v1/admin/certificates",
  PERM.certificateIssue,
);

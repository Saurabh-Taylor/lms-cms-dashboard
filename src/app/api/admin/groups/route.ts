import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/groups">(
  "/api/v1/admin/groups",
  PERM.learnerView,
);

export const POST = proxy<"/api/admin/groups">(
  "/api/v1/admin/groups",
  PERM.learnerUpdate,
);

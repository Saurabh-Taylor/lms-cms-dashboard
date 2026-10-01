import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/sso-providers">(
  "/api/v1/admin/sso-providers",
  PERM.settingsView,
);
export const POST = proxy<"/api/admin/sso-providers">(
  "/api/v1/admin/sso-providers",
  PERM.settingsUpdate,
);

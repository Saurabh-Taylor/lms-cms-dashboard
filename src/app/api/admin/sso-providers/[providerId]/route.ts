import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/sso-providers/[providerId]">(
  "/api/v1/admin/sso-providers/[providerId]",
  PERM.settingsUpdate,
);
export const DELETE = proxy<"/api/admin/sso-providers/[providerId]">(
  "/api/v1/admin/sso-providers/[providerId]",
  PERM.settingsUpdate,
);

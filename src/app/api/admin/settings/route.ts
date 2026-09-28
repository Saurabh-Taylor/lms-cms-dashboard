import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/settings">(
  "/api/v1/admin/settings",
  PERM.settingsView,
);

export const PUT = proxy<"/api/admin/settings">(
  "/api/v1/admin/settings",
  PERM.settingsUpdate,
);

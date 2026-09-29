import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/settings/smtp/test">(
  "/api/v1/admin/settings/smtp/test",
  PERM.settingsUpdate,
);

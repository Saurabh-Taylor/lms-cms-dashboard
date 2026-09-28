import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/email-templates">(
  "/api/v1/admin/email-templates",
  PERM.settingsView,
);

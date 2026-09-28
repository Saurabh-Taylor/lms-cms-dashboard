import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/rbac">("/api/v1/admin/rbac", PERM.adminView);

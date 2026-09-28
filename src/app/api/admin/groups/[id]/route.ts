import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/groups/[id]">("/api/v1/admin/groups/[id]", PERM.learnerUpdate);
export const DELETE = proxy<"/api/admin/groups/[id]">("/api/v1/admin/groups/[id]", PERM.learnerUpdate);

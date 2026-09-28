import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/users/[id]">("/api/v1/admin/users/[id]", PERM.learnerView);
export const PATCH = proxy<"/api/admin/users/[id]">("/api/v1/admin/users/[id]", PERM.learnerUpdate);
export const DELETE = proxy<"/api/admin/users/[id]">("/api/v1/admin/users/[id]", PERM.learnerDelete);

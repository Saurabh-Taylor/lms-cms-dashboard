import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/categories/[id]">("/api/v1/admin/categories/[id]", PERM.courseUpdate);
export const DELETE = proxy<"/api/admin/categories/[id]">("/api/v1/admin/categories/[id]", PERM.courseDelete);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/categories">("/api/v1/admin/categories", PERM.courseView);
export const POST = proxy<"/api/admin/categories">("/api/v1/admin/categories", PERM.courseCreate);

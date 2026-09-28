import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/users">("/api/v1/admin/users", PERM.learnerView);
export const POST = proxy<"/api/admin/users">("/api/v1/admin/users", PERM.learnerCreate);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/groups/[id]/members">("/api/v1/admin/groups/[id]/members", PERM.learnerView);
export const POST = proxy<"/api/admin/groups/[id]/members">("/api/v1/admin/groups/[id]/members", PERM.learnerUpdate);

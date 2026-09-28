import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const DELETE = proxy<"/api/admin/groups/[id]/members/[userId]">("/api/v1/admin/groups/[id]/members/[userId]", PERM.learnerUpdate);

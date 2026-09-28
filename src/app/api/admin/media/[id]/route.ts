import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const DELETE = proxy<"/api/admin/media/[id]">("/api/v1/admin/media/[id]", PERM.mediaDelete);

import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/media/quota">("/api/v1/admin/media/quota", PERM.mediaView);

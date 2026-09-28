import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const PATCH = proxy<"/api/admin/announcements/[id]">("/api/v1/admin/announcements/[id]", PERM.announcementCreate);
export const DELETE = proxy<"/api/admin/announcements/[id]">("/api/v1/admin/announcements/[id]", PERM.announcementCreate);

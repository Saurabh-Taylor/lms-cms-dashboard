import { proxy } from "@/lib/api/proxy";
import { requireAuthed } from "@/lib/me";


export const GET = proxy<"/api/me/notifications/unread-count">("/api/v1/me/notifications/unread-count", requireAuthed);

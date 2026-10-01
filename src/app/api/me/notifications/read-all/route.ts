import { proxy } from "@/lib/api/proxy";
import { requireAuthed } from "@/lib/me";

const authed = requireAuthed;

export const POST = proxy<"/api/me/notifications/read-all">("/api/v1/me/notifications/read-all", authed);

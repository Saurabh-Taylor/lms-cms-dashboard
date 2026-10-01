import { proxy } from "@/lib/api/proxy";
import { requireAuthed } from "@/lib/me";

const authed = requireAuthed;

export const GET = proxy<"/api/me/notifications">("/api/v1/me/notifications", authed);

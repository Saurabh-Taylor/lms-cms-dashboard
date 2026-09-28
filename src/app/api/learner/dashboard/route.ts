import { ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { learnerDashboard } from "@/lib/learner/data";
import { apiServer } from "@/lib/api-server";
import type { LearnerAnnouncement } from "@/lib/learner-types";

export async function GET() {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  // announcements flipped to the backend in module 1 — merged into the
  // still-SQLite dashboard bundle until the analytics module flips.
  const announcements = await apiServer<LearnerAnnouncement[]>(
    "/api/v1/learner/announcements",
  );
  return ok({ ...learnerDashboard(me.id), announcements: announcements.slice(0, 3) });
}

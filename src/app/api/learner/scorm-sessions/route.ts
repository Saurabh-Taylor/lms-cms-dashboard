import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const POST = proxy<"/api/learner/scorm-sessions">(
  "/api/v1/learner/scorm-sessions",
  requireLearner,
);

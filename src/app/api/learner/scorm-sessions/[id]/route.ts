import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const PUT = proxy<"/api/learner/scorm-sessions/[id]">(
  "/api/v1/learner/scorm-sessions/[id]",
  requireLearner,
);

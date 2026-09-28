import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const POST = proxy<"/api/learner/activity">(
  "/api/v1/learner/activity",
  requireLearner,
);

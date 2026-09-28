import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/assessments/[id]/attempts/[attemptId]">(
  "/api/v1/learner/assessments/[id]/attempts/[attemptId]",
  requireLearner,
);

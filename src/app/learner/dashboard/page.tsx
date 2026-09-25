import { getCurrentLearner } from "@/lib/me";
import { DashboardClient } from "./dashboard-client";

export const metadata = { title: "Dashboard · LearnHub" };

export default async function LearnerDashboardPage() {
  const me = await getCurrentLearner();
  return <DashboardClient firstName={me?.name.split(" ")[0] ?? "there"} />;
}

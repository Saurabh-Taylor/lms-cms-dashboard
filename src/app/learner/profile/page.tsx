import { getCurrentLearner } from "@/lib/me";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Profile · LearnHub" };

export default async function LearnerProfilePage() {
  const me = await getCurrentLearner();
  return <ProfileClient me={{ name: me?.name ?? "", email: me?.email ?? "", role: me?.role ?? "learner" }} />;
}

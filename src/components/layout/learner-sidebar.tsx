"use client";

import { AppSidebar } from "@/components/shared/app-shell/app-sidebar";
import { LEARNER_NAV } from "@/lib/nav-learner";

export function LearnerSidebar() {
  return <AppSidebar nav={LEARNER_NAV} brand={{ title: "LearnHub", href: "/learner/dashboard" }} />;
}

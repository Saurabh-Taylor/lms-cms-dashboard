"use client";

import * as React from "react";
import type { CurrentLearner } from "@/lib/me";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UiPrefsProvider } from "@/components/shared/app-shell/ui-prefs";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { LearnerHeader } from "@/components/layout/learner-header";
import { LearnerCommandPalette } from "@/components/layout/learner-command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { useCommandPalette } from "@/hooks/use-command-palette";

export function LearnerShell({
  me,
  children,
}: {
  me: CurrentLearner;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useCommandPalette();

  return (
    <UiPrefsProvider initial={me.uiPreferences} endpoint="/api/learner/me">
      <SidebarProvider>
        <LearnerSidebar />
        <SidebarInset className="min-w-0">
          <LearnerHeader me={me} onOpenSearch={() => setOpen(true)} />
          <main className="flex-1 p-4 md:p-6"><PageTransition>{children}</PageTransition></main>
        </SidebarInset>
        <LearnerCommandPalette open={open} onOpenChange={setOpen} />
      </SidebarProvider>
    </UiPrefsProvider>
  );
}

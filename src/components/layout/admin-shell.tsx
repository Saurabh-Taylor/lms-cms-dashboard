"use client";

import * as React from "react";
import type { CurrentAdmin } from "@/lib/me";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UiPrefsProvider } from "@/components/shared/app-shell/ui-prefs";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { useCommandPalette } from "@/hooks/use-command-palette";

export function AdminShell({
  me,
  admins,
  children,
}: {
  me: CurrentAdmin;
  admins: { id: number; name: string; email: string }[];
  children: React.ReactNode;
}) {
  const { open, setOpen } = useCommandPalette();

  return (
    <UiPrefsProvider initial={me.uiPreferences} endpoint="/api/admin/me">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <AdminHeader me={me} admins={admins} onOpenSearch={() => setOpen(true)} />
          <main className="flex-1 p-4 md:p-6"><PageTransition>{children}</PageTransition></main>
        </SidebarInset>
        <CommandPalette open={open} onOpenChange={setOpen} />
      </SidebarProvider>
    </UiPrefsProvider>
  );
}

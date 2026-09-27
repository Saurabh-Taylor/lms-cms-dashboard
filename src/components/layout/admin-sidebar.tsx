"use client";

import { AppSidebar } from "@/components/shared/app-shell/app-sidebar";
import { NAV } from "@/lib/nav";

/** Admin nav — filtered by the session's server-resolved RBAC permissions. */
export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (i) => !i.permission || permissions.includes(i.permission)
    ),
  })).filter((g) => g.items.length > 0);

  return <AppSidebar nav={nav} brand={{ title: "LearnHub CMS", href: "/admin/dashboard" }} />;
}

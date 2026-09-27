"use client";

import Link from "next/link";
import type { CurrentAdmin } from "@/lib/me";
import {
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/shared/app-shell/app-header";
import { NAV } from "@/lib/nav";

/** Admin header — generic chrome + admin menu items (settings, roles). */
export function AdminHeader({
  me,
  onOpenSearch,
}: {
  me: CurrentAdmin;
  onOpenSearch: () => void;
}) {
  return (
    <AppHeader
      nav={NAV}
      base={{ label: "Admin", href: "/admin/dashboard" }}
      user={{ name: me.name, email: me.email, roleLabel: me.appRole.replace("_", " ") }}
      onOpenSearch={onOpenSearch}
      notificationsHref="/admin/notifications"
      menuSections={
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={"/admin/settings" as never} />}>Settings</DropdownMenuItem>
          <DropdownMenuItem render={<Link href={"/admin/settings/roles" as never} />}>Roles &amp; permissions</DropdownMenuItem>
        </>
      }
    />
  );
}

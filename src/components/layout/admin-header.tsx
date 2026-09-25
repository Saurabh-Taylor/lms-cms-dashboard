"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { CurrentAdmin } from "@/lib/me";
import {
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/shared/app-shell/app-header";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Admin header — generic chrome + admin menu items (settings, demo switcher). */
export function AdminHeader({
  me,
  admins,
  onOpenSearch,
}: {
  me: CurrentAdmin;
  admins: { id: number; name: string; email: string }[];
  onOpenSearch: () => void;
}) {
  const router = useRouter();

  const switchAdmin = async (id: number, name: string) => {
    if (id === me.id) return;
    try {
      await api("/api/admin/me/switch", { method: "POST", body: JSON.stringify({ userId: id }) });
      toast.success(`Switched to ${name}`);
      router.refresh();
    } catch (e) {
      toast.error("Couldn't switch account", { description: (e as Error).message });
    }
  };

  return (
    <AppHeader
      nav={NAV}
      base={{ label: "Admin", href: "/admin/dashboard" }}
      user={{ name: me.name, email: me.email, roleLabel: "admin" }}
      onOpenSearch={onOpenSearch}
      notificationsHref="/admin/notifications"
      menuSections={
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={"/admin/settings" as never} />}>Settings</DropdownMenuItem>
          <DropdownMenuItem render={<Link href={"/admin/settings/roles" as never} />}>Roles &amp; permissions</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <UserRoundIcon className="size-3.5" /> Demo account
            </DropdownMenuLabel>
            {admins.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => switchAdmin(a.id, a.name)}>
                <CheckIcon className={cn("size-3.5", a.id === me.id ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{a.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </>
      }
    />
  );
}

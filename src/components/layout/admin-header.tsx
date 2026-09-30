"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
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
  const router = useRouter();
  const previewAs = async (persona: "learner" | "instructor") => {
    try {
      await api("/api/preview", { method: "POST", body: JSON.stringify({ persona }) });
      router.push("/learner/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't enter preview");
    }
  };
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => previewAs("learner")}>Preview as learner</DropdownMenuItem>
          <DropdownMenuItem onClick={() => previewAs("instructor")}>Preview as instructor</DropdownMenuItem>
        </>
      }
    />
  );
}

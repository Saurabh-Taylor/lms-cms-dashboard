"use client";

import Link from "next/link";
import type { CurrentLearner } from "@/lib/me";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/shared/app-shell/app-header";
import { LEARNER_NAV } from "@/lib/nav-learner";

/** Learner header — generic chrome + profile menu item only. */
export function LearnerHeader({
  me,
  onOpenSearch,
}: {
  me: CurrentLearner;
  onOpenSearch: () => void;
}) {
  return (
    <AppHeader
      nav={LEARNER_NAV}
      base={{ label: "Portal", href: "/learner/dashboard" }}
      user={{ name: me.name, email: me.email, roleLabel: me.role }}
      onOpenSearch={onOpenSearch}
      searchPlaceholder="Search my learning…"
      notificationsHref="/learner/announcements"
      menuSections={
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={"/learner/profile" as never} />}>
            Profile &amp; preferences
          </DropdownMenuItem>
        </>
      }
    />
  );
}

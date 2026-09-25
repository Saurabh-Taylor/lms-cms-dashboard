"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { BellIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { api } from "@/lib/api-client";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { NavGroup } from "@/lib/nav";

function crumbsFor(pathname: string, nav: NavGroup[]) {
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop portal root
  const crumbs: { label: string; href?: string }[] = [];
  let acc = `/${pathname.split("/")[1]}`;
  for (const part of parts) {
    acc += `/${part}`;
    const item = nav.flatMap((g) => g.items).find((i) => i.href === acc);
    const label = item?.title ?? (isNaN(Number(part)) ? part.replace(/-/g, " ") : `#${part}`);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Generic app header — sidebar trigger, breadcrumbs derived from the portal's
 * nav config, optional search launcher, optional notifications link, theme
 * toggle, and the user menu. Domain menu items arrive via `menuSections`.
 */
export function AppHeader({
  nav,
  base,
  user,
  onOpenSearch,
  searchPlaceholder = "Search…",
  notificationsHref,
  menuSections,
}: {
  nav: NavGroup[];
  base: { label: string; href: string };
  user: { name: string; email: string; roleLabel: string };
  onOpenSearch?: () => void;
  searchPlaceholder?: string;
  notificationsHref?: string;
  menuSections?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const crumbs = crumbsFor(pathname, nav);

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={base.href as never} />}>{base.label}</BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage className="capitalize">
                    <span key={c.label} className="inline-block animate-in fade-in slide-in-from-left-0.5 duration-(--duration-fast)">
                      {c.label}
                    </span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={c.href as never} />} className="capitalize">
                    <span key={c.label} className="inline-block animate-in fade-in slide-in-from-left-0.5 duration-(--duration-fast)">
                      {c.label}
                    </span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        {onOpenSearch && (
          <Button
            variant="outline"
            size="sm"
            className="w-52 justify-start gap-2 text-muted-foreground"
            onClick={onOpenSearch}
          >
            <SearchIcon className="size-3.5" />
            <span className="flex-1 text-left">{searchPlaceholder}</span>
            <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">⌘K</kbd>
          </Button>
        )}
        {notificationsHref && (
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={notificationsHref as never} />}
            aria-label="Notifications"
          >
            <BellIcon className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <SunIcon className="size-4 dark:hidden" />
          <MoonIcon className="hidden size-4 dark:block" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" className="rounded-full" />}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email} · {user.roleLabel}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            {menuSections}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" }).catch(() => {});
                router.push("/login");
                router.refresh();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

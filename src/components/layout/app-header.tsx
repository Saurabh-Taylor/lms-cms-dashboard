"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { BellIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
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
import { NAV } from "@/lib/nav";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
};

function crumbsFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  const crumbs: { label: string; href?: string }[] = [];
  let acc = "/admin";
  for (const part of parts) {
    acc += `/${part}`;
    const nav = NAV.flatMap((g) => g.items).find((i) => i.href === acc);
    const label = nav?.title ?? SECTION_LABELS[part] ?? (isNaN(Number(part)) ? part.replace(/-/g, " ") : `#${part}`);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

export function AppHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={"/admin/dashboard" as never} />}>Admin</BreadcrumbLink>
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
        <Button
          variant="outline"
          size="sm"
          className="w-52 justify-start gap-2 text-muted-foreground"
          onClick={onOpenSearch}
        >
          <SearchIcon className="size-3.5" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">⌘K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={"/admin/notifications" as never} />}
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
        </Button>
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
              <AvatarFallback className="text-[10px]">AU</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Admin User</span>
                  <span className="text-xs font-normal text-muted-foreground">admin@learnhub.dev · super_admin</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={"/admin/settings" as never} />}>Settings</DropdownMenuItem>
            <DropdownMenuItem render={<Link href={"/admin/settings/roles" as never} />}>Roles & permissions</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Sign out (demo)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

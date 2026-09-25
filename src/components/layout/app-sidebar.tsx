"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCapIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { NAV } from "@/lib/nav";
import { can, CURRENT_ROLE } from "@/lib/permissions";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />} tooltip="LearnHub CMS" className="gap-2.5 px-1.5 hover:bg-transparent">
              <div className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <GraduationCapIcon className="size-3.5" />
              </div>
              <span className="truncate text-[13px] font-semibold tracking-tight">LearnHub CMS</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {NAV.map((group, gi) => {
          const items = group.items.filter(
            (i) => !i.permission || can(CURRENT_ROLE, i.permission)
          );
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label ?? gi} className="px-3 py-1">
              {group.label && (
                <SidebarGroupLabel className="h-6 px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/45">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href as never} />}
                          isActive={active}
                          tooltip={item.title}
                          className="h-7 gap-2.5 px-2 text-[13px] text-sidebar-foreground/80 transition-colors duration-100 hover:text-sidebar-foreground data-active:font-medium data-active:text-sidebar-foreground data-active:shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)] [&_svg]:text-sidebar-foreground/50 data-active:[&_svg]:text-sidebar-primary"
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

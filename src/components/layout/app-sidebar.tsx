"use client";

import * as React from "react";
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

      <SidebarContent className="relative gap-1">
        <ActiveNavIndicator />
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
                          className="h-7 gap-2.5 px-2 text-[13px] text-sidebar-foreground/80 transition-colors duration-(--duration-fast) hover:text-sidebar-foreground data-active:bg-transparent data-active:font-medium data-active:text-sidebar-foreground [&_svg]:text-sidebar-foreground/50 data-active:[&_svg]:text-sidebar-primary [&>span]:transition-opacity [&>span]:duration-(--duration-fast) group-data-[collapsible=icon]:[&>span]:opacity-0"
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

/**
 * Sliding selection layer that glides to whichever nav item is active.
 * Measures the active SidebarMenuButton inside SidebarContent and animates
 * top/height between nav targets; hidden until measured.
 */
function ActiveNavIndicator() {
  const pathname = usePathname();
  const pillRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<{
    top: number; left: number; width: number; height: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    const container = pillRef.current?.parentElement;
    if (!container) return;
    const measure = () => {
      const el = container.querySelector<HTMLElement>(
        '[data-slot="sidebar-menu-button"][data-active]'
      );
      if (!el) return setRect(null);
      const cr = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - cr.top + container.scrollTop,
        left: r.left - cr.left,
        width: r.width,
        height: r.height,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [pathname]);

  return (
    <div
      ref={pillRef}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-sidebar-accent transition-[transform,width,height,opacity] duration-(--duration-moderate) ease-(--ease-standard)"
      style={{
        transform: `translate(${rect?.left ?? 0}px, ${rect?.top ?? 0}px)`,
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
        opacity: rect ? 1 : 0,
      }}
    >
      <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
    </div>
  );
}

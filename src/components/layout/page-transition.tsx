"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Subtle entrance for the main content area on navigation.
 * Remounts children keyed by pathname — sidebar/header stay stable.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in-95 slide-in-from-bottom-1 duration-(--duration-normal) ease-(--ease-enter)"
    >
      {children}
    </div>
  );
}

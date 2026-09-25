"use client";

import * as React from "react";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorAbove?: boolean;
}

export function RowActions({ items }: { items: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" />}
        onClick={(e) => e.stopPropagation()}
      >
        <EllipsisIcon />
        <span className="sr-only">Row actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((a, i) => (
          <React.Fragment key={i}>
            {a.separatorAbove && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={a.destructive ? "destructive" : "default"}
              disabled={a.disabled}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick?.();
              }}
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

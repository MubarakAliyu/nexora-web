"use client";

import * as React from "react";
import { DotsHorizontal } from "flowbite-react-icons/outline";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

/**
 * A "⋯" actions menu for a table row. Stops propagation so opening the menu or
 * picking an item never triggers the row's onRowClick (navigation / drawer).
 */
export function RowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Row actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <DotsHorizontal size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {actions.map((a, i) => (
            <React.Fragment key={a.label}>
              {a.separatorBefore && i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  a.onClick();
                }}
                className={cn(a.danger && "text-primary focus:text-primary")}
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

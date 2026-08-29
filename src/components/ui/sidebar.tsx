"use client";

import * as React from "react";
import Link from "next/link";
import { AngleDown } from "flowbite-react-icons/outline";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: SidebarItem[];
  /** Count pill on the right of the item — omit or 0 to hide it. */
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  activeHref?: string;
  collapsed?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function isActive(item: SidebarItem, activeHref?: string): boolean {
  if (item.href && item.href === activeHref) return true;
  return Boolean(item.children?.some((c) => isActive(c, activeHref)));
}

const nodeBase =
  "group flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Label that gently fades/slides in when the sidebar expands (mount animation). */
function NavLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("truncate motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1 motion-safe:duration-200", className)}>
      {children}
    </span>
  );
}

/** Wrap a collapsed item's trigger in a portaled tooltip (escapes the sidebar's
 *  overflow clip) showing its label to the right. */
function CollapsedTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNode({
  item,
  activeHref,
  collapsed,
}: {
  item: SidebarItem;
  activeHref?: string;
  collapsed: boolean;
}) {
  const active = isActive(item, activeHref);
  const [open, setOpen] = React.useState(active);
  const hasChildren = Boolean(item.children?.length);

  if (hasChildren) {
    const button = (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          nodeBase,
          "w-full",
          active ? "text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
          collapsed && "justify-center",
        )}
      >
        {item.icon && <span className="shrink-0">{item.icon}</span>}
        {!collapsed && (
          <>
            <NavLabel className="flex-1 text-left">{item.label}</NavLabel>
            <AngleDown size={16} className={cn("transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
    );
    return (
      <li>
        {collapsed ? <CollapsedTip label={item.label}>{button}</CollapsedTip> : button}
        {!collapsed && open && (
          <ul className="mt-1 space-y-1 border-l border-border pl-4">
            {item.children!.map((child, i) => (
              <SidebarNode key={`${child.label}-${i}`} item={child} activeHref={activeHref} collapsed={false} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const itemActive = item.href === activeHref;
  const link = (
    <Link
      href={item.href ?? "#"}
      aria-current={itemActive ? "page" : undefined}
      className={cn(
        nodeBase,
        itemActive ? "bg-surface-active text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
        collapsed && "justify-center",
      )}
    >
      {item.icon && <span className={cn("shrink-0", itemActive && "text-primary")}>{item.icon}</span>}
      {!collapsed && <NavLabel className="flex-1">{item.label}</NavLabel>}
      {!collapsed && !!item.badge && (
        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </Link>
  );

  return <li>{collapsed ? <CollapsedTip label={item.label}>{link}</CollapsedTip> : link}</li>;
}

/** Role-agnostic sidebar. Toggle `collapsed` (260px ↔ 72px); supports nested items. */
export function Sidebar({ items, activeHref, collapsed = false, header, footer, className }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-surface-elevated",
          collapsed ? "w-[72px]" : "w-[260px]",
          className,
        )}
      >
        {header && (
          <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
            {header}
          </div>
        )}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map((item, i) => (
              <SidebarNode key={`${item.label}-${i}`} item={item} activeHref={activeHref} collapsed={collapsed} />
            ))}
          </ul>
        </nav>
        {footer && <div className="border-t border-border p-3">{footer}</div>}
      </aside>
    </TooltipProvider>
  );
}

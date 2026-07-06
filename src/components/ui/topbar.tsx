"use client";

import * as React from "react";
import { Search, Bell } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";

interface TopbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  searchPlaceholder?: string;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  className?: string;
}

/** App topbar: optional left slot (menu/breadcrumb), search, notifications, profile slot. */
export function Topbar({
  left,
  right,
  searchPlaceholder = "Search…",
  notificationCount,
  onNotificationsClick,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-6",
        className,
      )}
    >
      {left}
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input placeholder={searchPlaceholder} aria-label="Search" className="pl-10" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
          onClick={onNotificationsClick}
        >
          <Bell size={20} />
          {notificationCount ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </Button>
        {right}
      </div>
    </header>
  );
}

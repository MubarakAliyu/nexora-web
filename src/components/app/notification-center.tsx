"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "flowbite-react-icons/outline";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/stores/notifications";
import { useSession } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const role = useSession((s) => s.user?.role);
  const allHref = role === "owner" ? "/owner/notifications" : "/notifications";
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const unread = items.filter((n) => n.status !== "read").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell size={20} />
          {mounted && unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="font-medium text-foreground">Notifications</span>
          <button
            type="button"
            onClick={markAllRead}
            className="text-caption font-medium text-primary transition-colors hover:text-accent"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.slice(0, 6).map((n) => (
            <button
              type="button"
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                "flex w-full gap-3 border-b border-border p-3 text-left transition-colors last:border-0 hover:bg-surface-hover",
                n.status !== "read" && "bg-surface-hover/70",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  n.status !== "read" ? "bg-primary" : "bg-transparent",
                )}
              />
              <span className="min-w-0">
                <span className="block text-body font-medium text-foreground">{n.title}</span>
                <span className="block truncate text-caption text-muted">{n.body}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="p-2">
          <Link
            href={allHref}
            className="block rounded-md p-2 text-center text-body font-medium text-primary transition-colors hover:bg-surface-hover"
          >
            View all
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

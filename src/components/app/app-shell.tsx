"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bars,
  AngleLeft,
  AngleRight,
  Search,
  Cog,
  User,
  ArrowRightToBracket,
} from "flowbite-react-icons/outline";
import { Sidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { NotificationCenter } from "./notification-center";
import { navForRole } from "./nav-config";
import { useSession } from "@/lib/stores/session";
import { useUI } from "@/lib/stores/ui";
import { useNotifications } from "@/lib/stores/notifications";
import { portalForRole, roleLabels } from "@/lib/roles";
import type { NotificationAudience } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

function titleCase(seg: string) {
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const brandLogo = (collapsed: boolean) =>
  collapsed ? (
    <Image src="/brand/icon-mark.svg" alt="Nexora" width={32} height={32} className="h-8 w-8" />
  ) : (
    <Image src="/brand/logo-primary.svg" alt="Nexora" width={150} height={35} className="h-7 w-auto" />
  );

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const setAudience = useNotifications((s) => s.setAudience);
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const [mounted, setMounted] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Mock auth guard — redirect to /login when unauthenticated.
  React.useEffect(() => {
    if (mounted && !user) router.replace("/login");
  }, [mounted, user, router]);

  React.useEffect(() => setDrawerOpen(false), [pathname]);

  // Point notifications at the right portal audience for the signed-in role.
  React.useEffect(() => {
    if (!user) return;
    const audience: NotificationAudience =
      user.role === "owner" ? "owner" : user.role === "tenant" ? "tenant" : "admin";
    setAudience(audience);
  }, [user, setAudience]);

  if (!mounted || !user) return null;

  // Owner has its own profile/settings routes (Batch 10); admin + tenant use the
  // shared ones until the Tenant portal (Batch 11) adds its own.
  const profileHref = user.role === "owner" ? "/owner/profile" : "/profile";
  const settingsHref = user.role === "owner" ? "/owner/settings" : "/settings";

  const nav = navForRole(user.role);
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = segs.map((seg, i) => ({
    label: i === 0 ? "Dashboard" : titleCase(seg),
    href: "/" + segs.slice(0, i + 1).join("/"),
  }));

  const collapseToggle = (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
        collapsed && "justify-center",
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <AngleRight size={18} /> : <AngleLeft size={18} />}
      {!collapsed && <span>Collapse</span>}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-surface-hover">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          items={nav}
          activeHref={pathname}
          collapsed={collapsed}
          header={
            <Link href={portalForRole(user.role)} aria-label="Nexora">
              {brandLogo(collapsed)}
            </Link>
          }
          footer={collapseToggle}
          className="sticky top-0 h-screen"
        />
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            items={nav}
            activeHref={pathname}
            header={
              <Link href={portalForRole(user.role)} aria-label="Nexora">
                {brandLogo(false)}
              </Link>
            }
            className="h-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background px-3 sm:px-4 md:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover lg:hidden"
          >
            <Bars size={24} />
          </button>

          {/* Breadcrumb — always visible, fills space, truncates on mobile */}
          <div className="min-w-0 flex-1">
            <Breadcrumb items={crumbs} />
          </div>

          {/* Right group — flush right at every breakpoint */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="relative hidden w-48 md:block lg:w-64">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input placeholder="Search…" aria-label="Search" className="h-10 pl-10" />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover md:hidden"
            >
              <Search size={20} />
            </button>

            <NotificationCenter />

            {/* Profile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="truncate font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-caption text-muted">{user.title ?? roleLabels[user.role]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>
                    <User size={16} /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <Cog size={16} /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    // Let the menu close first, then open the confirm dialog
                    // (avoids the Radix focus/pointer race between the two).
                    setTimeout(() => setLogoutOpen(true), 0);
                  }}
                >
                  <ArrowRightToBracket size={16} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* Mobile search */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="p-4">
          <SheetHeader>
            <SheetTitle className="sr-only">Search</SheetTitle>
          </SheetHeader>
          <div className="relative mt-2">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input autoFocus placeholder="Search…" aria-label="Search" className="h-11 pl-10" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Logout confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You’ll need to sign in again to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setLogoutOpen(false);
                logout();
                router.replace("/login");
              }}
            >
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

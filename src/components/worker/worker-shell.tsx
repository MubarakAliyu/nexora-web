"use client";

/**
 * Worker portal chrome (F4.2) — MOBILE-FIRST.
 *
 * Field workers are on phones, standing in someone's kitchen, not at a desk.
 * So this is a phone app pattern rather than a shrunken admin console:
 *
 *   - BOTTOM TAB BAR on mobile (thumb reach), promoted to a conventional
 *     sidebar at lg+ where a bottom bar would look wrong.
 *   - No breadcrumbs, no global search, no dense tables — none of the admin
 *     chrome. A worker needs four destinations and a status control.
 *   - 44px minimum touch targets throughout, generous spacing, high contrast.
 *
 * Auth: service workers only. The portal guard also stops a worker reaching
 * /admin, /owner or /tenant — see PORTAL GUARD below.
 */
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, Wallet, User } from "flowbite-react-icons/outline";
import { NotificationCenter } from "@/components/app/notification-center";
import { SessionTimeout } from "@/components/app/session-timeout";
import { useSession } from "@/lib/stores/session";
import { useTheme } from "@/lib/stores/theme";
import { useLive } from "@/lib/stores/live";
import { useNotifications } from "@/lib/stores/notifications";
import { ROLE_SERVICE_WORKER } from "@/lib/roles";
import { staffForUser, AVAILABILITY_LABEL } from "@/lib/api/worker";
import { AvailabilityPill } from "@/components/worker/availability-control";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/worker", label: "Today", icon: Home },
  { href: "/worker/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/worker/earnings", label: "Earnings", icon: Wallet },
  { href: "/worker/profile", label: "Profile", icon: User },
];

const isActive = (pathname: string, href: string) =>
  href === "/worker" ? pathname === "/worker" : pathname.startsWith(href);

export function WorkerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const theme = useTheme((s) => s.theme);
  const revision = useLive((s) => s.revision);
  const setAudience = useNotifications((s) => s.setAudience);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (mounted && !user) router.replace("/login");
  }, [mounted, user, router]);

  // Forced password change on a freshly-granted worker account.
  React.useEffect(() => {
    if (mounted && user?.requiresPasswordChange) router.replace("/change-password");
  }, [mounted, user, router]);

  /* PORTAL GUARD — anyone who is not a service worker is sent to their own
     portal. The mirror of this (workers kept out of /admin, /owner, /tenant)
     lives in AppShell, so the rule holds from both directions. */
  React.useEffect(() => {
    if (!mounted || !user) return;
    if (user.role !== ROLE_SERVICE_WORKER) router.replace("/login");
  }, [mounted, user, router]);

  React.useEffect(() => {
    const el = document.documentElement;
    if (theme === "dark") el.classList.add("dark");
    else el.classList.remove("dark");
    return () => el.classList.remove("dark");
  }, [theme]);

  React.useEffect(() => { setAudience("worker"); }, [setAudience]);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );

  if (!mounted || !user || user.role !== ROLE_SERVICE_WORKER) return null;

  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken lg:flex-row">
      <SessionTimeout />

      {/* Sidebar — lg+ only. The same four destinations as the bottom bar. */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-elevated lg:flex lg:flex-col">
        <div className="border-b border-border p-5">
          <Link href="/worker">
            <Image src="/brand/logo-primary.png" alt="Nexora" width={840} height={310} className="h-8 w-auto dark:hidden" />
            <Image src="/brand/logo-white.png" alt="Nexora" width={840} height={310} className="hidden h-8 w-auto dark:block" />
          </Link>
          <p className="mt-3 text-caption uppercase tracking-wide text-muted">Service Worker</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-body font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon size={20} /> {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="text-caption text-muted">Signed in as</p>
          <p className="truncate text-body font-medium text-foreground">{user.name}</p>
          <p className="truncate text-caption text-muted">
            {member?.jobTitle ?? "Service Worker"}
            {member?.availability ? ` · ${AVAILABILITY_LABEL[member.availability]}` : ""}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Simplified topbar — name, availability, bell. No search, no crumbs. */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface-elevated">
          <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="min-w-0">
              <p className="truncate font-heading text-h3 font-semibold text-foreground">
                Hi, {firstName}
              </p>
              <p className="truncate text-caption text-muted">{member?.jobTitle ?? "Service Worker"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AvailabilityPill member={member} />
              <NotificationCenter />
            </div>
          </div>
        </header>

        <main
          id="main"
          className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile/tablet only. */}
      <nav
        aria-label="Worker sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-caption font-medium transition-colors",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon size={22} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

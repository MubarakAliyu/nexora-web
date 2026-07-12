import { create } from "zustand";
import {
  notificationsByAudience,
  type AppNotification,
  type NotificationAudience,
} from "@/lib/api/notifications";

interface NotificationsState {
  audience: NotificationAudience;
  items: AppNotification[];
  /** Point the bell + list at a portal's notifications (called by the shell). */
  setAudience: (audience: NotificationAudience) => void;
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const clone = (audience: NotificationAudience) =>
  notificationsByAudience[audience].map((n) => ({ ...n }));

/**
 * Session-scoped notifications shared by the topbar bell + the notifications
 * page. Audience-aware: the app shell calls `setAudience(role)` so an owner sees
 * only owner-relevant notifications, a tenant only theirs, staff the org feed.
 * Read state persists while the audience is unchanged (navigating within a portal).
 */
export const useNotifications = create<NotificationsState>((set, get) => ({
  audience: "admin",
  items: clone("admin"),
  setAudience: (audience) =>
    set((s) => (s.audience === audience ? {} : { audience, items: clone(audience) })),
  unreadCount: () => get().items.filter((n) => n.status !== "read").length,
  markRead: (id) =>
    set((s) => ({
      items: s.items.map((n) =>
        n.id === id ? { ...n, status: "read", read_at: new Date().toISOString() } : n,
      ),
    })),
  markAllRead: () =>
    set((s) => ({
      items: s.items.map((n) => ({
        ...n,
        status: "read" as const,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    })),
}));

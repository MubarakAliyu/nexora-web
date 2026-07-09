import { create } from "zustand";
import { mockNotifications, type AppNotification } from "@/lib/api/notifications";

interface NotificationsState {
  items: AppNotification[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/** Session-scoped notifications (shared by the topbar bell + /notifications). */
export const useNotifications = create<NotificationsState>((set, get) => ({
  items: mockNotifications,
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

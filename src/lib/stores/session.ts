import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/roles";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface SessionState {
  user: SessionUser | null;
  /** User awaiting 2FA verification (set at login for admin roles). */
  pending: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  setPending: (user: SessionUser | null) => void;
}

/**
 * Mock client session, persisted to localStorage. Stands in for the PRD's JWT
 * auth until the backend is wired — components read `user` to gate the app.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      pending: null,
      login: (user) => set({ user, pending: null }),
      logout: () => set({ user: null, pending: null }),
      setRole: (role) => set((s) => (s.user ? { user: { ...s.user, role } } : {})),
      setPending: (pending) => set({ pending }),
    }),
    { name: "nexora-session", partialize: (s) => ({ user: s.user }) },
  ),
);

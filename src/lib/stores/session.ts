import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/roles";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  /** Domain links for identity-scoped portals (owner / tenant). */
  ownerId?: string;
  tenantId?: string;
  /** Forces the first-login password-change gate. */
  requiresPasswordChange?: boolean;
}

interface SessionState {
  user: SessionUser | null;
  /** User awaiting 2FA verification (kept for the standalone /2fa demo page). */
  pending: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
  setPending: (user: SessionUser | null) => void;
  /** Clear the first-login password-change requirement after a successful change. */
  completePasswordChange: () => void;
}

/**
 * Mock client session, persisted to localStorage. Stands in for the PRD's JWT
 * auth until the backend is wired — components read `user` to gate the app and
 * to scope data (owner/tenant portals filter by `ownerId` / `tenantId`).
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      pending: null,
      login: (user) => set({ user, pending: null }),
      logout: () => set({ user: null, pending: null }),
      setPending: (pending) => set({ pending }),
      completePasswordChange: () =>
        set((s) => (s.user ? { user: { ...s.user, requiresPasswordChange: false } } : {})),
    }),
    { name: "nexora-session", partialize: (s) => ({ user: s.user }) },
  ),
);

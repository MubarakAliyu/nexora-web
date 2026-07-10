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
}

interface SessionState {
  user: SessionUser | null;
  /** User awaiting 2FA verification (kept for the standalone /2fa demo page). */
  pending: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
  setPending: (user: SessionUser | null) => void;
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
    }),
    { name: "nexora-session", partialize: (s) => ({ user: s.user }) },
  ),
);

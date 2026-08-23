import { create } from "zustand";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "renewed"
  | "terminated"
  | "status_changed"
  | "invited"
  | "sent";

export interface AuditEntry {
  id: string;
  at: string; // ISO
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityName: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface AuditState {
  entries: AuditEntry[];
  add: (entry: Omit<AuditEntry, "id" | "at">) => void;
  clear: () => void;
  /** MOCK-LAYER: restore the trail after a hard reload. */
  hydrate: (entries: AuditEntry[]) => void;
}

let seq = 0;

/**
 * In-session audit trail. Every mutation in the app records who did what, to
 * which entity, when, with optional before/after values. Read by Settings →
 * Audit Trail (Pass 3). Session-scoped (not persisted).
 */
export const useAudit = create<AuditState>((set) => ({
  entries: [],
  add: (entry) =>
    set((s) => ({
      entries: [{ ...entry, id: `audit_${++seq}_${Date.now()}`, at: new Date().toISOString() }, ...s.entries],
    })),
  clear: () => set({ entries: [] }),
  hydrate: (entries) => set((s) => (entries.length ? { entries } : s)),
}));

/**
 * ⚠️ MOCK-LAYER SHIM — REMOVE WHEN THE REAL BACKEND LANDS.
 *
 * The mock "database" in `db.ts` is module-level in-memory state. That works fine
 * within a single SPA session, but a HARD browser navigation (which is exactly what
 * happens crossing the (marketing) → (app) route-group boundary, and on every login
 * redirect) re-instantiates the module and destroys anything created at runtime.
 * That is the root cause of regressions R1/R2: the lead/booking really WAS written,
 * then thrown away before the admin could read it.
 *
 * This module adds a localStorage-backed hydrate/persist cycle around the existing
 * arrays. It deliberately:
 *   - does NOT change any API surface, store shape, or component;
 *   - mutates the exported arrays IN PLACE (splice/push) so every module that already
 *     holds a reference to them keeps working;
 *   - versions the payload, so changing seed data in a future batch re-seeds instead
 *     of leaving users on a stale snapshot;
 *   - is client-only and runs after mount, so SSR output is always the pure seed and
 *     there is no hydration mismatch.
 *
 * When real HTTP lands, delete this file and the <MockDataHydrator /> mount; the
 * typed accessors in lib/api/* become fetch calls and nothing else changes.
 */
import * as db from "@/lib/mock/db";

/** Bump when seeded data changes shape/content so stale snapshots are discarded. */
export const SCHEMA_VERSION = "e1-2026-08-15b";
const DB_KEY = "nexora-mock-db";
const NOTIF_KEY = "nexora-notifications";
const AUDIT_KEY = "nexora-audit";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/** The runtime-mutable collections. Order/keys are part of the persisted payload. */
const COLLECTIONS = {
  owners: db.owners,
  properties: db.properties,
  units: db.units,
  tenants: db.tenants,
  leases: db.leases,
  invoices: db.invoices,
  payments: db.payments,
  expenses: db.expenses,
  tickets: db.tickets,
  leads: db.leads,
  staff: db.staff,
  users: db.users,
  announcements: db.announcements,
  activities: db.activities,
  bookings: db.bookings,
  serviceBookings: db.serviceBookings,
  agreements: db.agreements,
  settlements: db.settlements,
  roleDefs: db.roleDefs,
} as const;

type CollectionKey = keyof typeof COLLECTIONS;

/** Pristine seed snapshot, captured at module load before any hydration. */
const SEED: Record<string, unknown[]> = Object.fromEntries(
  Object.entries(COLLECTIONS).map(([k, arr]) => [k, arr.map((row) => ({ ...(row as object) }))]),
);

/** Replace an array's contents in place so existing references stay valid. */
function replaceInPlace(target: unknown[], next: unknown[]) {
  target.splice(0, target.length, ...next);
}

/* ------------------------------------------------------------------ read */

interface StoredPayload {
  version: string;
  collections: Partial<Record<CollectionKey, unknown[]>>;
}

function readPayload(): StoredPayload | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (!parsed || parsed.version !== SCHEMA_VERSION) {
      // Stale snapshot from an older seed — discard and re-seed.
      window.localStorage.removeItem(DB_KEY);
      window.localStorage.removeItem(NOTIF_KEY);
      window.localStorage.removeItem(AUDIT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Hydrate the mock DB from localStorage. No-op (keeps seed) when nothing stored. */
export function hydrateMockDb(): boolean {
  const payload = readPayload();
  if (!payload) return false;
  for (const key of Object.keys(COLLECTIONS) as CollectionKey[]) {
    const stored = payload.collections[key];
    if (Array.isArray(stored)) replaceInPlace(COLLECTIONS[key] as unknown[], stored);
  }
  return true;
}

export function readStoredNotifications<T>(): T[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(NOTIF_KEY);
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

export function readStoredAudit<T>(): T[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- write */

let timer: ReturnType<typeof setTimeout> | null = null;

function writeNow() {
  if (!isBrowser()) return;
  try {
    const collections = Object.fromEntries(
      Object.entries(COLLECTIONS).map(([k, arr]) => [k, arr]),
    ) as StoredPayload["collections"];
    window.localStorage.setItem(DB_KEY, JSON.stringify({ version: SCHEMA_VERSION, collections }));
  } catch {
    // Quota exceeded / private mode — the app still works, it just won't survive reload.
  }
}

/** Debounced snapshot of the whole mock DB (called on every live-revision bump). */
export function persistMockDb(delay = 400) {
  if (!isBrowser()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(writeNow, delay);
}

export function persistNotifications(items: unknown[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(NOTIF_KEY, JSON.stringify(items));
  } catch { /* ignore quota */ }
}

export function persistAudit(entries: unknown[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, 200)));
  } catch { /* ignore quota */ }
}

/* ----------------------------------------------------------------- reset */

/** Restore every collection to its pristine seed and clear persisted state. */
export function resetMockData() {
  for (const key of Object.keys(COLLECTIONS) as CollectionKey[]) {
    replaceInPlace(COLLECTIONS[key] as unknown[], (SEED[key] ?? []).map((row) => ({ ...(row as object) })));
  }
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(DB_KEY);
      window.localStorage.removeItem(NOTIF_KEY);
      window.localStorage.removeItem(AUDIT_KEY);
    } catch { /* ignore */ }
  }
}

"use client";

import * as React from "react";
import {
  hydrateMockDb, persistMockDb, readStoredNotifications, readStoredAudit,
  persistNotifications, persistAudit,
} from "@/lib/mock/persistence";
import { useLive } from "@/lib/stores/live";
import { useNotifications } from "@/lib/stores/notifications";
import { useAudit } from "@/lib/stores/audit";
import type { AppNotification } from "@/lib/api/notifications";
import type { AuditEntry } from "@/lib/stores/audit";

/**
 * ⚠️ MOCK-LAYER SHIM — REMOVE WITH lib/mock/persistence.ts WHEN THE BACKEND LANDS.
 *
 * Restores the mock DB + runtime notifications + audit trail after a hard page load
 * (which is what crossing the marketing → dashboard route-group boundary triggers),
 * then keeps them saved as mutations happen.
 *
 * Renders nothing and hydrates in an effect, so the server and first client render
 * are always the pure seed — no hydration mismatch. Once restored it bumps the live
 * revision, which is exactly how every other mutation tells `useAsync` to re-fetch.
 */
export function MockDataHydrator() {
  React.useEffect(() => {
    const restored = hydrateMockDb();

    const notifs = readStoredNotifications<AppNotification>();
    if (notifs?.length) useNotifications.getState().hydrate(notifs);

    const audit = readStoredAudit<AuditEntry>();
    if (audit?.length) useAudit.getState().hydrate(audit);

    // Tell every subscribed view to re-read now that the real data is back.
    if (restored || notifs?.length || audit?.length) useLive.getState().bump();

    // Every mutation bumps the revision — snapshot the DB on each (debounced).
    const unsubLive = useLive.subscribe(() => persistMockDb());
    const unsubNotif = useNotifications.subscribe((s) => persistNotifications(s.systemItems));
    const unsubAudit = useAudit.subscribe((s) => persistAudit(s.entries));

    return () => { unsubLive(); unsubNotif(); unsubAudit(); };
  }, []);

  return null;
}

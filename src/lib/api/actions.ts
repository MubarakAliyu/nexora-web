/**
 * Single path every mutation flows through. It (1) bumps the live revision so
 * every subscribed view (lists, detail, dashboard KPIs, charts) refreshes at
 * once, (2) writes an audit-trail entry, and (3) optionally raises a system
 * notification (bell +1). Toasts are fired by the calling component.
 */
import { useLive } from "@/lib/stores/live";
import { useAudit, type AuditAction } from "@/lib/stores/audit";
import { useNotifications } from "@/lib/stores/notifications";
import { useSession } from "@/lib/stores/session";
import type { NotificationAudience, NotificationType } from "@/lib/api/notifications";

export interface RecordInput {
  entityType: string;
  entityId: string;
  entityName: string;
  action: AuditAction;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  notify?: { type: NotificationType; title: string; body: string; audiences?: NotificationAudience[] } | false;
}

export function recordMutation(input: RecordInput): void {
  const actor = useSession.getState().user?.name ?? "System";
  useLive.getState().bump();
  useAudit.getState().add({
    actor,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    summary: input.summary,
    before: input.before,
    after: input.after,
  });
  if (input.notify) {
    useNotifications.getState().pushSystem({
      ...input.notify,
      /*
       * A `recordMutation` notification is the INTERNAL operational record of the
       * change — it names the other party, quotes figures, and is written in
       * back-office voice ("TKT-0027 — Voice check kitchen tap drip (low)").
       * Every party-facing message in this codebase is a separate `pushNotify`
       * written in that party's own voice, so defaulting these to admin is what
       * the pairing always assumed. Without it an owner reads operational chatter
       * about their tenant, and a worker reads settings changes.
       *
       * An explicit `audiences` on the notify still wins — that is how the F3
       * owner-decision messages reach the owner as well as the admin.
       */
      audiences: input.notify.audiences ?? ["admin"],
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actor,
    });
  }
}

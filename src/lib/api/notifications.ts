/**
 * Mocked notifications data-access layer. Typed to the PRD notification shape
 * (type, channel, status, timestamps). Notifications are audience-scoped so the
 * shared topbar bell + list show the right set per portal (admin / owner /
 * tenant) — an owner never sees org-wide admin noise.
 */

export type NotificationType =
  | "payment"
  | "maintenance"
  | "lease"
  | "announcement"
  | "system";

export type NotificationChannel = "in_app" | "email" | "sms";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: "sent" | "read";
  sent_at: string;
  read_at: string | null;
  /** Present on notifications generated live by an action. */
  /**
   * Restricts this notification to specific audiences. Undefined means "everyone",
   * which is the existing behaviour for the vast majority of runtime notifications.
   * Set it when a message must NOT reach a party — e.g. an owner's decline reason,
   * which is between Nexora and the owner and must never reach the tenant.
   */
  audiences?: NotificationAudience[];
  /**
   * Narrows a notification to ONE person within its audience.
   *
   * The "worker" audience is every service worker. A job notification is about
   * one worker's job, so without this every worker's bell carried every other
   * worker's references — the F4 analogue of the F3 audience leak. Undefined
   * means "everyone in the audience", which is right for announcements.
   */
  recipientStaffId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  actor?: string;
}

export type NotificationAudience = "admin" | "owner" | "tenant" | "worker";

/** Org-wide operational notifications (internal staff portal). */
const adminNotifications: AppNotification[] = [
  { id: "n1", type: "payment", title: "Rent payment received", body: "UGX 1,200,000 received for Unit 4B, Nakasero Heights.", entityType: "payment", channel: "in_app", status: "sent", sent_at: "2026-07-07T08:12:00Z", read_at: null },
  { id: "n2", type: "maintenance", title: "New maintenance request", body: "Plumbing issue reported at Kololo Court, Unit 2A.", entityType: "ticket", channel: "in_app", status: "sent", sent_at: "2026-07-07T07:40:00Z", read_at: null },
  { id: "n3", type: "lease", title: "Lease expiring soon", body: "Lease for Unit 12, Munyonyo Suites expires in 30 days.", entityType: "lease", channel: "email", status: "sent", sent_at: "2026-07-06T16:05:00Z", read_at: null },
  { id: "n4", type: "announcement", title: "Scheduled water maintenance", body: "Water supply maintenance at Bugolobi Lofts on Saturday.", entityType: "announcement", channel: "in_app", status: "read", sent_at: "2026-07-05T10:00:00Z", read_at: "2026-07-05T11:20:00Z" },
  { id: "n5", type: "payment", title: "Owner disbursement sent", body: "Monthly net disbursement processed for Entebbe Villas.", entityType: "settlement", channel: "in_app", status: "read", sent_at: "2026-07-04T09:30:00Z", read_at: "2026-07-04T09:45:00Z" },
  { id: "n6", type: "maintenance", title: "Maintenance completed", body: "Electrical repair at Lugogo Offices marked resolved.", entityType: "ticket", channel: "in_app", status: "read", sent_at: "2026-07-03T14:15:00Z", read_at: "2026-07-03T15:00:00Z" },
  { id: "n7", type: "system", title: "Monthly report ready", body: "Your June statement is available to download.", entityType: "settlement", channel: "in_app", status: "sent", sent_at: "2026-07-02T08:00:00Z", read_at: null },
  { id: "n8", type: "lease", title: "New lease signed", body: "12-month lease signed for Unit 7, Naguru Ridge.", entityType: "lease", channel: "in_app", status: "read", sent_at: "2026-07-01T12:00:00Z", read_at: "2026-07-01T12:30:00Z" },
];

/** Owner-relevant only: reports, disbursements, and alerts on Salim's 4 properties. */
const ownerNotifications: AppNotification[] = [
  { id: "on1", type: "system", title: "June statement ready", body: "Your June financial statement for all 4 properties is available to download.", entityType: "settlement", channel: "in_app", status: "sent", sent_at: "2026-07-08T08:00:00Z", read_at: null },
  { id: "on2", type: "payment", title: "Disbursement processed", body: "Net disbursement of UGX 96.4M paid to your account for June.", entityType: "settlement", channel: "in_app", status: "sent", sent_at: "2026-07-05T09:30:00Z", read_at: null },
  { id: "on3", type: "payment", title: "Rent collected — Nakasero Heights", body: "UGX 2,800,000 received for Unit A-407.", channel: "in_app", status: "sent", sent_at: "2026-07-05T08:12:00Z", read_at: null },
  { id: "on4", type: "maintenance", title: "Maintenance completed", body: "AC repair at Muyenga Heights resolved at no cost to you.", channel: "in_app", status: "read", sent_at: "2026-07-03T14:15:00Z", read_at: "2026-07-03T15:00:00Z" },
  { id: "on5", type: "lease", title: "Lease renewed — Entebbe Villas", body: "A 12-month lease renewal was completed, keeping occupancy stable.", channel: "email", status: "read", sent_at: "2026-07-01T10:00:00Z", read_at: "2026-07-01T10:20:00Z" },
  { id: "on6", type: "system", title: "Q2 statement ready", body: "Your Q2 2026 owner statement and disbursement summary are available.", channel: "in_app", status: "read", sent_at: "2026-06-30T08:00:00Z", read_at: "2026-06-30T09:00:00Z" },
  { id: "on7", type: "lease", title: "Lease expiring — Kira Gardens", body: "A tenancy at Kira Gardens expires in 45 days; Nexora is arranging renewal.", channel: "in_app", status: "read", sent_at: "2026-06-27T16:05:00Z", read_at: "2026-06-27T17:00:00Z" },
];

/** Tenant-personal only: their rent, their unit, their tickets. */
const tenantNotifications: AppNotification[] = [
  { id: "tn1", type: "payment", title: "Rent due soon", body: "Your July rent of UGX 2,800,000 is due on the 5th.", entityType: "payment", channel: "in_app", status: "sent", sent_at: "2026-07-01T08:00:00Z", read_at: null },
  { id: "tn2", type: "maintenance", title: "Maintenance scheduled", body: "A technician will visit A-407 on Thursday for your reported issue.", entityType: "ticket", channel: "in_app", status: "sent", sent_at: "2026-06-30T11:00:00Z", read_at: null },
  { id: "tn3", type: "payment", title: "Payment confirmed", body: "We received your June rent payment. Thank you!", entityType: "payment", channel: "in_app", status: "read", sent_at: "2026-06-05T09:00:00Z", read_at: "2026-06-05T09:30:00Z" },
  { id: "tn4", type: "announcement", title: "Water maintenance — Nakasero Heights", body: "Water will be interrupted Saturday 09:00–13:00 for tank cleaning.", entityType: "announcement", channel: "in_app", status: "read", sent_at: "2026-06-28T10:00:00Z", read_at: "2026-06-28T12:00:00Z" },
];

/** Worker-personal only: their assigned jobs and their pay. */
const workerNotifications: AppNotification[] = [
  { id: "wn1", type: "system", title: "Job assigned", body: "A cleaning job at Nakasero Heights, A-407 was assigned to you for Thursday 09:00.", entityType: "service-booking", channel: "in_app", status: "sent", sent_at: "2026-07-08T07:30:00Z", read_at: null },
  { id: "wn2", type: "system", title: "Schedule updated", body: "Your Friday afternoon job was rescheduled to 14:00.", entityType: "service-booking", channel: "in_app", status: "sent", sent_at: "2026-07-06T15:10:00Z", read_at: null },
  { id: "wn3", type: "payment", title: "Payout processed", body: "Your payout for June has been processed.", entityType: "payout", channel: "in_app", status: "read", sent_at: "2026-07-02T09:00:00Z", read_at: "2026-07-02T09:20:00Z" },
];

export const notificationsByAudience: Record<NotificationAudience, AppNotification[]> = {
  admin: adminNotifications,
  owner: ownerNotifications,
  tenant: tenantNotifications,
  worker: workerNotifications,
};

/** Back-compat default (admin set). */
export const mockNotifications = adminNotifications;

/**
 * Where a notification should navigate, derived from its entity reference.
 * Returns null when the notification carries no entity (seeded/informational),
 * so the caller can render it as plain text instead of a link.
 */
export function notificationHref(
  n: Pick<AppNotification, "entityType" | "entityId">,
  role: "admin" | "owner" | "tenant" = "admin",
): string | null {
  const { entityType: t, entityId: id } = n;
  if (!t) return null;

  if (role === "tenant") {
    switch (t) {
      case "invoice": case "payment": return "/tenant/payments";
      case "ticket": return "/tenant/maintenance";
      case "lease": return "/tenant/lease";
      case "booking": return "/tenant/bookings";
      case "announcement": return "/tenant/notifications";
      default: return null;
    }
  }
  if (role === "owner") {
    switch (t) {
      case "property": return id ? `/owner/properties/${id}` : "/owner/properties";
      case "settlement": case "payment": case "expense": return "/owner/financials";
      case "agreement": return "/owner/agreement";
      case "lease": case "ticket": return "/owner";
      default: return null;
    }
  }
  // admin / staff
  switch (t) {
    case "lead": return id ? `/admin/leads/${id}` : "/admin/leads";
    case "booking": return "/admin/bookings";
    case "service-booking": return "/admin/service-bookings";
    case "ticket": return "/admin/maintenance";
    case "invoice": case "payment": case "expense": return "/admin/finance";
    case "lease": return "/admin/leases";
    case "owner": return id ? `/admin/owners/${id}` : "/admin/owners";
    case "tenant": return id ? `/admin/tenants/${id}` : "/admin/tenants";
    case "property": return id ? `/admin/properties/${id}` : "/admin/properties";
    case "unit": return "/admin/units";
    case "staff": return id ? `/admin/staff/${id}` : "/admin/staff";
    case "agreement": return id ? `/admin/agreements/${id}` : "/admin/agreements";
    case "settlement": return "/admin/financial-overview";
    case "announcement": return "/admin/announcements";
    case "role": case "settings": case "integration": return "/admin/settings";
    default: return null;
  }
}

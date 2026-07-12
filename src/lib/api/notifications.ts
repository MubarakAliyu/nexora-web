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
}

export type NotificationAudience = "admin" | "owner" | "tenant";

/** Org-wide operational notifications (internal staff portal). */
const adminNotifications: AppNotification[] = [
  { id: "n1", type: "payment", title: "Rent payment received", body: "UGX 1,200,000 received for Unit 4B, Nakasero Heights.", channel: "in_app", status: "sent", sent_at: "2026-07-07T08:12:00Z", read_at: null },
  { id: "n2", type: "maintenance", title: "New maintenance request", body: "Plumbing issue reported at Kololo Court, Unit 2A.", channel: "in_app", status: "sent", sent_at: "2026-07-07T07:40:00Z", read_at: null },
  { id: "n3", type: "lease", title: "Lease expiring soon", body: "Lease for Unit 12, Munyonyo Suites expires in 30 days.", channel: "email", status: "sent", sent_at: "2026-07-06T16:05:00Z", read_at: null },
  { id: "n4", type: "announcement", title: "Scheduled water maintenance", body: "Water supply maintenance at Bugolobi Lofts on Saturday.", channel: "in_app", status: "read", sent_at: "2026-07-05T10:00:00Z", read_at: "2026-07-05T11:20:00Z" },
  { id: "n5", type: "payment", title: "Owner disbursement sent", body: "Monthly net disbursement processed for Entebbe Villas.", channel: "in_app", status: "read", sent_at: "2026-07-04T09:30:00Z", read_at: "2026-07-04T09:45:00Z" },
  { id: "n6", type: "maintenance", title: "Maintenance completed", body: "Electrical repair at Lugogo Offices marked resolved.", channel: "in_app", status: "read", sent_at: "2026-07-03T14:15:00Z", read_at: "2026-07-03T15:00:00Z" },
  { id: "n7", type: "system", title: "Monthly report ready", body: "Your June statement is available to download.", channel: "in_app", status: "sent", sent_at: "2026-07-02T08:00:00Z", read_at: null },
  { id: "n8", type: "lease", title: "New lease signed", body: "12-month lease signed for Unit 7, Naguru Ridge.", channel: "in_app", status: "read", sent_at: "2026-07-01T12:00:00Z", read_at: "2026-07-01T12:30:00Z" },
];

/** Owner-relevant only: reports, disbursements, and alerts on Salim's 4 properties. */
const ownerNotifications: AppNotification[] = [
  { id: "on1", type: "system", title: "June statement ready", body: "Your June financial statement for all 4 properties is available to download.", channel: "in_app", status: "sent", sent_at: "2026-07-08T08:00:00Z", read_at: null },
  { id: "on2", type: "payment", title: "Disbursement processed", body: "Net disbursement of UGX 96.4M paid to your account for June.", channel: "in_app", status: "sent", sent_at: "2026-07-05T09:30:00Z", read_at: null },
  { id: "on3", type: "payment", title: "Rent collected — Nakasero Heights", body: "UGX 2,800,000 received for Unit A-407.", channel: "in_app", status: "sent", sent_at: "2026-07-05T08:12:00Z", read_at: null },
  { id: "on4", type: "maintenance", title: "Maintenance completed", body: "AC repair at Muyenga Heights resolved at no cost to you.", channel: "in_app", status: "read", sent_at: "2026-07-03T14:15:00Z", read_at: "2026-07-03T15:00:00Z" },
  { id: "on5", type: "lease", title: "Lease renewed — Entebbe Villas", body: "A 12-month lease renewal was completed, keeping occupancy stable.", channel: "email", status: "read", sent_at: "2026-07-01T10:00:00Z", read_at: "2026-07-01T10:20:00Z" },
  { id: "on6", type: "system", title: "Q2 statement ready", body: "Your Q2 2026 owner statement and disbursement summary are available.", channel: "in_app", status: "read", sent_at: "2026-06-30T08:00:00Z", read_at: "2026-06-30T09:00:00Z" },
  { id: "on7", type: "lease", title: "Lease expiring — Kira Gardens", body: "A tenancy at Kira Gardens expires in 45 days; Nexora is arranging renewal.", channel: "in_app", status: "read", sent_at: "2026-06-27T16:05:00Z", read_at: "2026-06-27T17:00:00Z" },
];

/** Tenant-personal only: their rent, their unit, their tickets. */
const tenantNotifications: AppNotification[] = [
  { id: "tn1", type: "payment", title: "Rent due soon", body: "Your July rent of UGX 2,800,000 is due on the 5th.", channel: "in_app", status: "sent", sent_at: "2026-07-01T08:00:00Z", read_at: null },
  { id: "tn2", type: "maintenance", title: "Maintenance scheduled", body: "A technician will visit A-407 on Thursday for your reported issue.", channel: "in_app", status: "sent", sent_at: "2026-06-30T11:00:00Z", read_at: null },
  { id: "tn3", type: "payment", title: "Payment confirmed", body: "We received your June rent payment. Thank you!", channel: "in_app", status: "read", sent_at: "2026-06-05T09:00:00Z", read_at: "2026-06-05T09:30:00Z" },
  { id: "tn4", type: "announcement", title: "Water maintenance — Nakasero Heights", body: "Water will be interrupted Saturday 09:00–13:00 for tank cleaning.", channel: "in_app", status: "read", sent_at: "2026-06-28T10:00:00Z", read_at: "2026-06-28T12:00:00Z" },
];

export const notificationsByAudience: Record<NotificationAudience, AppNotification[]> = {
  admin: adminNotifications,
  owner: ownerNotifications,
  tenant: tenantNotifications,
};

/** Back-compat default (admin set). */
export const mockNotifications = adminNotifications;

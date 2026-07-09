/**
 * Mocked notifications data-access layer. Typed to the PRD notification shape
 * (type, channel, status, timestamps).
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

export const mockNotifications: AppNotification[] = [
  { id: "n1", type: "payment", title: "Rent payment received", body: "UGX 1,200,000 received for Unit 4B, Nakasero Heights.", channel: "in_app", status: "sent", sent_at: "2026-07-07T08:12:00Z", read_at: null },
  { id: "n2", type: "maintenance", title: "New maintenance request", body: "Plumbing issue reported at Kololo Court, Unit 2A.", channel: "in_app", status: "sent", sent_at: "2026-07-07T07:40:00Z", read_at: null },
  { id: "n3", type: "lease", title: "Lease expiring soon", body: "Lease for Unit 12, Munyonyo Suites expires in 30 days.", channel: "email", status: "sent", sent_at: "2026-07-06T16:05:00Z", read_at: null },
  { id: "n4", type: "announcement", title: "Scheduled water maintenance", body: "Water supply maintenance at Bugolobi Lofts on Saturday.", channel: "in_app", status: "read", sent_at: "2026-07-05T10:00:00Z", read_at: "2026-07-05T11:20:00Z" },
  { id: "n5", type: "payment", title: "Owner disbursement sent", body: "Monthly net disbursement processed for Entebbe Villas.", channel: "in_app", status: "read", sent_at: "2026-07-04T09:30:00Z", read_at: "2026-07-04T09:45:00Z" },
  { id: "n6", type: "maintenance", title: "Maintenance completed", body: "Electrical repair at Lugogo Offices marked resolved.", channel: "in_app", status: "read", sent_at: "2026-07-03T14:15:00Z", read_at: "2026-07-03T15:00:00Z" },
  { id: "n7", type: "system", title: "Monthly report ready", body: "Your June statement is available to download.", channel: "in_app", status: "sent", sent_at: "2026-07-02T08:00:00Z", read_at: null },
  { id: "n8", type: "lease", title: "New lease signed", body: "12-month lease signed for Unit 7, Naguru Ridge.", channel: "in_app", status: "read", sent_at: "2026-07-01T12:00:00Z", read_at: "2026-07-01T12:30:00Z" },
];

/**
 * Service worker portal (F4).
 *
 * E2 created operational staff as RECORDS ONLY — people who receive job
 * assignments but have no login. The 27 Aug minutes asked for "a simple unified
 * dashboard instead of depending entirely on phone calls from the office", one
 * dashboard covering cleaning, laundry, car wash and maintenance.
 *
 * This module adds the fourth portal's data layer. Two things it deliberately
 * does NOT do:
 *
 *   1. It does not change the customer-facing lifecycle. A worker accepting,
 *      starting or completing a job feeds the SAME E3/F1 service-booking and F3
 *      maintenance flows — the manager still confirms completion.
 *   2. It is not a wallet. See WorkerEarning in types.ts.
 *
 * READ-PATH NOTE (the F3 lesson): assignment data used to have exactly one
 * consumer — an admin looking at everyone's jobs. Every helper here reads it as
 * a WORKER looking at their own, which is why the lookups below go through
 * `assigneeId` where it exists and fall back to the display name where E2-era
 * records only carry that.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify, genTempPassword } from "@/lib/api/admin-mutations";
import type {
  Staff, StaffAvailability, WorkerDayAvailability, WorkerType, WeekDay,
} from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ resolution */

export function staffById(id?: string | null): Staff | undefined {
  if (!id) return undefined;
  return db.staff.find((s) => s.id === id);
}

/** The Staff record behind a signed-in worker's session user. */
export function staffForUser(userId?: string | null, staffId?: string | null): Staff | undefined {
  if (staffId) {
    const byStaffId = db.staff.find((s) => s.id === staffId);
    if (byStaffId) return byStaffId;
  }
  if (!userId) return undefined;
  return db.staff.find((s) => s.userId === userId);
}

/**
 * Does this job belong to this worker?
 *
 * `assigneeId` is authoritative, but E2-era seed rows and several admin flows
 * only ever set the display name. An admin list never noticed — it shows every
 * job regardless. A worker's "my jobs" filter would silently show them nothing.
 */
export function isAssignedTo(
  job: { assigneeId?: string | null; assignee?: string | null },
  member: Staff | undefined,
): boolean {
  if (!member) return false;
  if (job.assigneeId) return job.assigneeId === member.id;
  return !!job.assignee && job.assignee === member.name;
}

/* -------------------------------------------------- portal access (F4.1) */

export const WORKER_TYPE_LABEL: Record<WorkerType, string> = {
  employee: "Employee",
  contractor: "Contractor",
};

export interface GrantAccessInput {
  email: string;
  workerType: WorkerType;
  actor: string;
}

export interface GrantAccessResult {
  tempPassword: string;
  email: string;
  member: Staff;
}

/** Only operational staff can be given a worker login — never a system user. */
export function canGrantPortalAccess(member: Staff): boolean {
  return member.staffType === "operational_staff" && !member.hasPortalAccess;
}

export async function grantPortalAccess(
  staffId: string,
  input: GrantAccessInput,
): Promise<GrantAccessResult> {
  await mDelay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error("Staff member not found");
  if (member.staffType !== "operational_staff") {
    throw new Error("Portal access is for operational staff only");
  }
  const email = input.email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("That email already has a Nexora account");
  }

  const tempPassword = genTempPassword();
  const userId = `usr_${member.id}`;
  db.addUser({
    id: userId,
    name: member.name,
    email,
    password: tempPassword,
    role: "service_worker",
    staffId: member.id,
    title: member.jobTitle ?? "Service Worker",
    requiresPasswordChange: true,
  });

  member.email = email;
  member.hasPortalAccess = true;
  member.userId = userId;
  member.workerType = input.workerType;
  member.availabilitySchedule ??= db.defaultAvailabilitySchedule();
  // Credit work they had already completed before they had a login.
  const backfilled = backfillEarnings(member);

  recordMutation({
    entityType: "staff", entityId: staffId, entityName: member.name, action: "updated",
    summary: `Granted worker portal access to ${member.name} (${email}, ${WORKER_TYPE_LABEL[input.workerType]}) by ${input.actor}${backfilled ? `; credited ${backfilled} completed job${backfilled === 1 ? "" : "s"} to their earnings` : ""}`,
    before: { hasPortalAccess: false },
    after: { hasPortalAccess: true, email, workerType: input.workerType, userId },
    notify: {
      type: "system", title: "Worker portal access granted",
      // The credentials are for whoever is issuing them, not for other audiences.
      body: `${member.name} can now sign in at ${email}. Temporary password: ${tempPassword} — they must change it on first login.`,
      audiences: ["admin"],
    },
  });
  pushNotify(
    "system", "Welcome to Nexora",
    `Your Nexora worker account is ready. Sign in with ${email} using the temporary password you were given, then set your own.`,
    "staff", staffId, "created", ["worker"], staffId,
  );
  return { tempPassword, email, member };
}

export async function revokePortalAccess(staffId: string, actor: string): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error("Staff member not found");

  const userId = member.userId;
  // The LOGIN goes; the staff record stays, with its job history and assignments.
  if (userId) {
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx >= 0) db.users.splice(idx, 1);
  }
  member.hasPortalAccess = false;
  member.userId = null;

  recordMutation({
    entityType: "staff", entityId: staffId, entityName: member.name, action: "updated",
    summary: `Revoked worker portal access for ${member.name} by ${actor}. Staff record retained.`,
    before: { hasPortalAccess: true, userId },
    after: { hasPortalAccess: false, userId: null },
    notify: {
      type: "system", title: "Worker portal access revoked",
      body: `${member.name} can no longer sign in. Their staff record and job history are unchanged.`,
      audiences: ["admin"],
    },
  });
  return member;
}

/* ----------------------------------------------------------- availability */

export const AVAILABILITY_LABEL: Record<StaffAvailability, string> = {
  available: "Available",
  busy: "Busy",
  off: "Away",
  on_leave: "On leave",
};

/** The three a worker can set themselves. "On leave" is an admin/HR state. */
export const WORKER_SETTABLE_AVAILABILITY: StaffAvailability[] = ["available", "busy", "off"];

export async function setWorkerAvailability(
  staffId: string,
  next: StaffAvailability,
): Promise<Staff> {
  await mDelay(250);
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error("Staff member not found");
  const before = member.availability;
  member.availability = next;

  recordMutation({
    entityType: "staff", entityId: staffId, entityName: member.name, action: "updated",
    summary: `${member.name} set their availability to ${AVAILABILITY_LABEL[next]} (was ${before ? AVAILABILITY_LABEL[before] : "unset"})`,
    before: { availability: before }, after: { availability: next },
    notify: {
      type: "system", title: "Worker availability changed",
      body: `${member.name} is now ${AVAILABILITY_LABEL[next]}.`,
      audiences: ["admin"],
    },
  });
  return member;
}

export const DAY_LABEL: Record<WeekDay, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export const WEEK_DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function availabilityScheduleFor(member: Staff | undefined): WorkerDayAvailability[] {
  return member?.availabilitySchedule ?? db.defaultAvailabilitySchedule();
}

export async function saveAvailabilitySchedule(
  staffId: string,
  schedule: WorkerDayAvailability[],
): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error("Staff member not found");
  const before = member.availabilitySchedule;
  member.availabilitySchedule = schedule;

  const summary = schedule.filter((d) => d.available).map((d) => `${DAY_LABEL[d.day].slice(0, 3)} ${d.start}–${d.end}`).join(", ") || "no days available";
  recordMutation({
    entityType: "staff", entityId: staffId, entityName: member.name, action: "updated",
    summary: `${member.name} updated their weekly availability — ${summary}`,
    before: { schedule: before }, after: { schedule },
    notify: {
      type: "system", title: "Worker availability schedule updated",
      body: `${member.name} updated their weekly availability: ${summary}.`,
      audiences: ["admin"],
    },
  });
  return member;
}

/** Is the worker rostered on at this date/time, per their own schedule? */
export function isWithinSchedule(member: Staff | undefined, when: string | Date): boolean {
  const schedule = availabilityScheduleFor(member);
  const d = typeof when === "string" ? new Date(when) : when;
  if (Number.isNaN(d.getTime())) return true;
  const day = WEEK_DAYS[(d.getUTCDay() + 6) % 7]; // JS weeks start Sunday
  const row = schedule.find((r) => r.day === day);
  if (!row || !row.available) return false;
  const hhmm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return hhmm >= row.start && hhmm <= row.end;
}

/* ------------------------------------------------------ self-service edit */

/**
 * A worker editing their OWN contact details.
 *
 * Deliberately separate from the admin `updateStaff`: that function is an admin
 * changing someone else's role/status/department, and widening it to carry
 * self-service fields would blur who did what in the audit trail. This records
 * the worker as the actor and touches only what they own.
 */
export async function updateWorkerContact(
  staffId: string,
  patch: { phone?: string; email?: string; address?: string },
): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error("Staff member not found");

  const email = patch.email?.trim().toLowerCase();
  if (email && email !== member.email?.toLowerCase()) {
    if (db.users.some((u) => u.email.toLowerCase() === email && u.id !== member.userId)) {
      throw new Error("That email is already in use");
    }
    // Keep the login in step with the record, or they can't sign in tomorrow.
    const account = db.users.find((u) => u.id === member.userId);
    if (account) account.email = email;
  }

  const before = { phone: member.phone, email: member.email, address: member.address };
  if (patch.phone !== undefined) member.phone = patch.phone.trim();
  if (email !== undefined) member.email = email;
  if (patch.address !== undefined) member.address = patch.address.trim();

  recordMutation({
    entityType: "staff", entityId: staffId, entityName: member.name, action: "updated",
    summary: `${member.name} updated their own contact details`,
    before, after: { phone: member.phone, email: member.email, address: member.address },
    notify: {
      type: "system", title: "Worker details updated",
      body: `${member.name} updated their contact details.`,
      audiences: ["admin"],
    },
  });
  return member;
}

/* ------------------------------------------------------------- earnings */

/**
 * The worker's share of a job. Placeholder pending stakeholder confirmation —
 * the 27 Aug meeting did not settle worker rates.
 */
export const WORKER_SHARE_RATE = 0.35;

/**
 * Credit a worker for work they have ALREADY completed.
 *
 * The seed credits the three pre-granted workers at module load. Anyone granted
 * access afterwards has exactly the same job history and, without this, opened
 * Earnings to zeroes — E2 staff have been working for months before they get a
 * login. Idempotent: it skips anything already credited, so re-granting after a
 * revoke does not double-pay.
 */
export function backfillEarnings(member: Staff): number {
  const already = new Set(
    db.workerEarnings.filter((e) => e.staffId === member.id).map((e) => e.sourceId),
  );
  let added = 0;

  for (const sb of db.serviceBookings) {
    if (sb.status !== "completed" && sb.status !== "confirmed") continue;
    if (!isAssignedTo(sb, member) || already.has(sb.id)) continue;
    const amount = Math.round(((sb.amount ?? 0) * WORKER_SHARE_RATE) / 1000) * 1000;
    if (amount <= 0) continue;
    db.workerEarnings.push({
      id: `wed_${member.id}_${sb.id}`,
      staffId: member.id,
      sourceType: "service_booking",
      sourceId: sb.id,
      reference: sb.reference,
      description: `${sb.category} — ${sb.name ?? "customer"}`,
      amount,
      earnedAt: sb.date ?? db.NOW_ISO,
      payoutId: null,
    });
    added += 1;
  }

  for (const t of db.tickets) {
    if (t.status !== "closed" && t.status !== "completed") continue;
    if (!isAssignedTo(t, member) || already.has(t.id)) continue;
    const cost = t.cost ?? t.actualCost ?? t.assessedCost ?? 0;
    const amount = Math.round((cost * WORKER_SHARE_RATE) / 1000) * 1000;
    if (amount <= 0) continue;
    const unit = db.units.find((u) => u.id === t.unitId)?.label ?? "unit";
    db.workerEarnings.push({
      id: `wed_${member.id}_${t.id}`,
      staffId: member.id,
      sourceType: "ticket",
      sourceId: t.id,
      reference: t.ref,
      description: `${t.title} — ${unit}`,
      amount,
      earnedAt: t.closedAt ?? t.updatedAt ?? db.NOW_ISO,
      payoutId: null,
    });
    added += 1;
  }
  return added;
}

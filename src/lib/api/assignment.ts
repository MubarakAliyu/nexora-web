/**
 * Assignment scheduling awareness (F4.4).
 *
 * Before F4 an assignment dropdown was a flat list of names: the office had no
 * way to see that the person they were about to send already had a job at that
 * hour. Now that workers keep their own availability, the admin can see it.
 *
 * ⚠️ FRONTEND CONVENIENCE ONLY. This is a warning, not a constraint — the
 * backend will ultimately own conflict validation, because only it sees the
 * authoritative schedule and can serialise two admins assigning at once. An
 * admin may always override; they just have to mean it.
 */
import * as db from "@/lib/mock/db";
import { staffOptions, serviceStaffFor, type StaffOption } from "@/lib/api/admin";
import { isAssignedTo, isWithinSchedule } from "@/lib/api/worker";
import type { Staff } from "@/lib/mock/types";
import type { Role } from "@/lib/roles";

export interface ScheduledJobRef {
  ref: string;
  title: string;
  at: string | null;
  /** "HH:MM" in UTC, when the record carries a time. */
  time: string | null;
}

export interface AssignmentOption extends StaffOption {
  /** Jobs this person already has on the target date. */
  jobsOnDate: ScheduledJobRef[];
  /** The one that clashes with the target time, if any. */
  conflict: ScheduledJobRef | null;
  /** False when the target time falls outside the hours they set themselves. */
  withinSchedule: boolean;
  /** Away / on leave — shown, but de-emphasised. */
  unavailable: boolean;
  /** Human-readable warning, or "" when the slot is clear. */
  warning: string;
}

const hhmm = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const sameDay = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  const x = new Date(a), y = new Date(b);
  if (Number.isNaN(x.getTime()) || Number.isNaN(y.getTime())) return false;
  return x.getUTCFullYear() === y.getUTCFullYear()
    && x.getUTCMonth() === y.getUTCMonth()
    && x.getUTCDate() === y.getUTCDate();
};

/** Everything already on this person's plate for the given day. */
export function jobsOnDate(member: Staff, targetDate: string): ScheduledJobRef[] {
  const out: ScheduledJobRef[] = [];
  for (const sb of db.serviceBookings) {
    if (sb.status === "cancelled" || sb.status === "confirmed") continue;
    if (!isAssignedTo(sb, member) || !sameDay(sb.date, targetDate)) continue;
    out.push({ ref: sb.reference, title: sb.category, at: sb.date ?? null, time: hhmm(sb.date) });
  }
  for (const t of db.tickets) {
    if (t.status === "closed") continue;
    if (!isAssignedTo(t, member) || !sameDay(t.updatedAt, targetDate)) continue;
    out.push({ ref: t.ref, title: t.title, at: t.updatedAt ?? null, time: hhmm(t.updatedAt) });
  }
  return out.sort((a, b) => ((a.time ?? "") < (b.time ?? "") ? -1 : 1));
}

/**
 * Assignment options enriched with what each person already has on.
 *
 * Sorted available-first, then by how loaded they are — so the obvious choice
 * is at the top and the person who is Away is at the bottom, still selectable.
 */
export function assignmentOptions(
  filter: { departments?: string[]; roles?: Role[] } | undefined,
  targetDate: string | null | undefined,
): AssignmentOption[] {
  const base = filter ? staffOptions(filter) : staffOptions();
  const targetTime = hhmm(targetDate);

  const rows = base.map((opt): AssignmentOption => {
    const member = db.staff.find((s) => s.id === opt.id);
    const onDate = member && targetDate ? jobsOnDate(member, targetDate) : [];
    const conflict = targetTime
      ? onDate.find((j) => j.time && j.time === targetTime) ?? null
      : null;
    const withinSchedule = !targetDate || !member ? true : isWithinSchedule(member, targetDate);
    const unavailable = opt.availability === "off" || opt.availability === "on_leave";

    let warning = "";
    if (conflict) {
      warning = `${opt.name} already has a job scheduled at ${conflict.time} on this date (${conflict.ref})`;
    } else if (onDate.length > 0 && targetDate) {
      warning = `${opt.name} already has ${onDate.length} job${onDate.length === 1 ? "" : "s"} on this date`;
    } else if (!withinSchedule) {
      warning = `${opt.name} is not scheduled to work at this time`;
    } else if (unavailable) {
      warning = `${opt.name} is currently ${opt.availability === "on_leave" ? "on leave" : "away"}`;
    }

    return { ...opt, jobsOnDate: onDate, conflict, withinSchedule, unavailable, warning };
  });

  return rows.sort((a, b) => {
    if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1;
    if (!!a.conflict !== !!b.conflict) return a.conflict ? 1 : -1;
    if (a.withinSchedule !== b.withinSchedule) return a.withinSchedule ? -1 : 1;
    if (a.jobsOnDate.length !== b.jobsOnDate.length) return a.jobsOnDate.length - b.jobsOnDate.length;
    return a.name.localeCompare(b.name);
  });
}

/** The label an assignment <option> shows, including its load for the day. */
export function assignmentLabel(o: AssignmentOption): string {
  const load = o.jobsOnDate.length ? ` · ${o.jobsOnDate.length} job${o.jobsOnDate.length === 1 ? "" : "s"} that day` : "";
  return `${o.label}${load}${o.conflict ? " · CLASH" : ""}`;
}

/**
 * Scheduling-aware options for a SERVICE booking.
 *
 * Mirrors `serviceStaffFor`'s department mapping rather than reimplementing it,
 * then enriches the result. Kept here so the mapping rule stays in one place —
 * `serviceStaffFor` is still the answer to "who may do this kind of work".
 */
export function serviceAssignmentOptions(
  kind: string,
  category: string | undefined,
  targetDate: string | null | undefined,
): AssignmentOption[] {
  const eligible = new Set(serviceStaffFor(kind, category).map((s) => s.id));
  return assignmentOptions(undefined, targetDate).filter((o) => eligible.has(o.id));
}

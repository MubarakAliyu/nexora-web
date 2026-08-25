/**
 * Admin-initiated password reset (E5).
 *
 * Support gets calls: "I can't log in, I've forgotten my password." The automated
 * forgot-password flow doesn't help someone who phones instead of clicking, so an
 * admin needs a way to put them back in.
 *
 * SECURITY BOUNDARY — the admin can INITIATE a reset. The admin can never READ an
 * existing password. Nothing here returns `user.password`; the only credential that
 * ever leaves this module is a freshly generated temporary one, and the account is
 * flagged so the user must replace it on first login.
 *
 * Identity verification is enforced at the UI (three confirmations + notes) and
 * recorded here in the audit trail, which is the compliance record for the reset.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify, genTempPassword } from "@/lib/api/admin-mutations";
import { useSession } from "@/lib/stores/session";
import type { MockUser } from "@/lib/mock/types";

const mDelay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export type VerificationMethod =
  | "email_confirmation"
  | "phone_call"
  | "in_person_id"
  | "document_email";

export const VERIFICATION_METHOD_LABEL: Record<VerificationMethod, string> = {
  email_confirmation: "Email confirmation",
  phone_call: "Phone call to registered number",
  in_person_id: "In-person with ID",
  document_email: "Document submitted via email",
};

/** A resettable account — someone who actually has a login. */
export interface ResettableUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

/** Mask an email for on-screen comparison: mubarak@gmail.com → mu•••@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

/** Mask a phone, keeping the country prefix and last two digits. */
export function maskPhone(phone?: string): string {
  if (!phone) return "Not on file";
  const digits = phone.replace(/\s+/g, "");
  if (digits.length < 6) return "•••";
  return `${digits.slice(0, 4)} ••• ••• ${digits.slice(-2)}`;
}

/**
 * Find the login account behind an owner / tenant / staff record. Operational
 * staff have no account, so this returns null for them and the UI hides the action.
 */
export function findUserAccount(entityId: string): ResettableUser | null {
  const u = db.users.find(
    (x) => x.id === entityId || x.ownerId === entityId || x.tenantId === entityId || x.staffId === entityId,
  );
  if (!u) return null;
  const owner = u.ownerId ? db.owners.find((o) => o.id === u.ownerId) : undefined;
  const tenant = u.tenantId ? db.tenants.find((t) => t.id === u.tenantId) : undefined;
  const staff = u.staffId ? db.staff.find((s) => s.id === u.staffId) : undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: owner?.phone ?? tenant?.phone ?? staff?.phone,
    role: u.role,
  };
}

/** True when this record has a login that can be reset. */
export function hasLoginAccount(entityId: string): boolean {
  return !!findUserAccount(entityId);
}

export interface ResetPasswordInput {
  /** Owner / tenant / staff record id, or the user id itself. */
  entityId: string;
  method: VerificationMethod;
  /** How identity was verified — stored verbatim in the audit trail. */
  notes: string;
}

export interface ResetPasswordResult {
  tempPassword: string;
  user: ResettableUser;
}

/**
 * Issue a temporary password. Returns it ONCE, to be shown to the admin and
 * communicated out of band; it is never retrievable afterwards.
 */
export async function resetUserPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
  await mDelay();
  const account = findUserAccount(input.entityId);
  if (!account) throw new Error("No login account for this record");

  const user = db.users.find((u) => u.id === account.id) as MockUser;
  const tempPassword = genTempPassword();
  user.password = tempPassword;
  user.requiresPasswordChange = true;

  // If the target happens to be the signed-in user, drop their session — a reset
  // must force re-authentication rather than leave a live session behind it.
  const session = useSession.getState();
  if (session.user?.id === account.id) session.logout();

  const actor = session.user?.name ?? "Support";
  const methodLabel = VERIFICATION_METHOD_LABEL[input.method];

  recordMutation({
    entityType: "user",
    entityId: account.id,
    entityName: account.name,
    action: "updated",
    // The compliance record: who, whom, how verified, and the verifier's own words.
    summary: `Password reset for ${account.name} (${account.email}) by ${actor} — identity verified via ${methodLabel}. Notes: ${input.notes}`,
    after: {
      resetBy: actor,
      targetUser: account.email,
      verificationMethod: methodLabel,
      verificationNotes: input.notes,
      requiresPasswordChange: true,
    },
    notify: {
      type: "system",
      title: "Password reset",
      body: `Password reset for ${account.name} (${account.email}) — temporary credentials issued by ${actor}`,
    },
  });

  pushNotify(
    "system",
    "Your password has been reset",
    "Your Nexora password has been reset by support. Log in with the temporary password provided and set a new password.",
    "user",
    account.id,
  );

  return { tempPassword, user: account };
}

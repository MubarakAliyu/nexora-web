/**
 * Mocked auth data-access layer. Validates against the seeded user table in
 * `lib/mock/db.ts` and returns a session/token shape mirroring the PRD's JWT
 * auth. All five seed accounts use password "123456".
 */

import type { Role } from "@/lib/roles";
import { findUser, users, changeUserPassword } from "@/lib/mock/db";

export interface SessionUserPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  ownerId?: string;
  tenantId?: string;
  requiresPasswordChange?: boolean;
}

export interface AuthSession {
  token: string;
  user: SessionUserPayload;
}

const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

function fakeToken() {
  return `mock.${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Incorrect email or password.");
    this.name = "InvalidCredentialsError";
  }
}

/** Validate email + password against the seed table. Throws on mismatch. */
export async function login(email: string, password: string): Promise<AuthSession> {
  await delay();
  const u = findUser(email, password);
  if (!u) throw new InvalidCredentialsError();
  return {
    token: fakeToken(),
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      ownerId: u.ownerId,
      tenantId: u.tenantId,
      requiresPasswordChange: u.requiresPasswordChange,
    },
  };
}

export class WrongCurrentPasswordError extends Error {
  constructor() { super("Your current password is incorrect."); this.name = "WrongCurrentPasswordError"; }
}

/** First-login password change: validate current, set new, clear the flag. */
export async function changePassword(userId: string, current: string, next: string): Promise<{ ok: true }> {
  await delay();
  const u = users.find((x) => x.id === userId);
  if (!u || u.password !== current) throw new WrongCurrentPasswordError();
  changeUserPassword(userId, next);
  return { ok: true };
}

export async function register(
  name: string,
  email: string,
  _password: string,
): Promise<AuthSession> {
  await delay();
  return {
    token: fakeToken(),
    user: { id: "u_new", name, email, role: "super_admin", title: "Super Administrator" },
  };
}

/**
 * Request a reset link. In this mock we always report success (don't leak which
 * emails exist) but only mint a usable token for real seed accounts, and echo
 * it back so the demo flow can continue to /reset-password?token=...
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true; token: string }> {
  await delay();
  const known = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const token = known ? `reset.${btoa(email).replace(/=/g, "")}.${Date.now()}` : "";
  return { ok: true, token };
}

export class InvalidTokenError extends Error {
  constructor() {
    super("This reset link is invalid or has expired.");
    this.name = "InvalidTokenError";
  }
}

/** A token is valid if it looks like a minted reset token. */
export function isValidResetToken(token: string | null | undefined): boolean {
  return typeof token === "string" && /^reset\.[A-Za-z0-9+/]+\.\d+$/.test(token);
}

export async function resetPassword(token: string, _password: string): Promise<{ ok: true }> {
  await delay();
  if (!isValidResetToken(token)) throw new InvalidTokenError();
  return { ok: true };
}

export async function verifyEmail(_token: string): Promise<{ ok: true }> {
  await delay(1200);
  return { ok: true };
}

/** Demo 2FA — the fixed verification code for every seed account. */
export const DEMO_2FA_CODE = "123456";

export async function verifyTwoFactor(code: string): Promise<{ ok: boolean }> {
  await delay();
  return { ok: code === DEMO_2FA_CODE };
}

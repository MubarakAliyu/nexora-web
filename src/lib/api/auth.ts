/**
 * Mocked auth data-access layer. Simulates network latency and returns a
 * session/token shape that mirrors what the PRD's JWT auth will provide.
 */

import type { Role } from "@/lib/roles";

export interface AuthSession {
  token: string;
  user: { id: string; name: string; email: string; role: Role };
}

const delay = (ms = 900) => new Promise((r) => setTimeout(r, ms));

function fakeToken() {
  return `mock.${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

function nameFromEmail(email: string) {
  const handle = email.split("@")[0] ?? "User";
  return handle
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export async function login(
  email: string,
  _password: string,
  role: Role = "super_admin",
): Promise<AuthSession> {
  await delay();
  return { token: fakeToken(), user: { id: "u_1", name: nameFromEmail(email), email, role } };
}

export async function register(
  name: string,
  email: string,
  _password: string,
): Promise<AuthSession> {
  await delay();
  return { token: fakeToken(), user: { id: "u_new", name, email, role: "super_admin" } };
}

export async function requestPasswordReset(
  _email: string,
): Promise<{ ok: true; token: string }> {
  await delay();
  return { ok: true, token: "mock-reset-token" };
}

export async function resetPassword(
  _token: string,
  _password: string,
): Promise<{ ok: true }> {
  await delay();
  return { ok: true };
}

export async function verifyEmail(_token: string): Promise<{ ok: true }> {
  await delay(1200);
  return { ok: true };
}

export async function verifyTwoFactor(code: string): Promise<{ ok: boolean }> {
  await delay();
  return { ok: /^\d{6}$/.test(code) };
}

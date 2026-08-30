/**
 * Role model (per the Nexora PRD). Internal/staff roles all live in the /admin
 * portal; owners, tenants and service workers get their own portals.
 */

export type Role =
  | "super_admin"
  | "ops_manager"
  | "property_manager"
  | "maintenance_officer"
  | "finance_officer"
  | "owner"
  | "tenant"
  | "service_worker";

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  ops_manager: "Operations Manager",
  property_manager: "Property Manager",
  maintenance_officer: "Maintenance Officer",
  finance_officer: "Finance Officer",
  owner: "Owner",
  tenant: "Tenant",
  service_worker: "Service Worker",
};

export const adminRoles: Role[] = [
  "super_admin",
  "ops_manager",
  "property_manager",
  "maintenance_officer",
  "finance_officer",
];

/**
 * F4 — the field-worker role. Named "Service Worker" rather than "Service
 * Officer"; the 27 Aug minutes left the naming open and "Officer" collides with
 * the internal *_officer admin roles above.
 */
export const ROLE_SERVICE_WORKER: Role = "service_worker";

export const allRoles: Role[] = [...adminRoles, "owner", "tenant", ROLE_SERVICE_WORKER];

export type Portal = "/admin" | "/owner" | "/tenant" | "/worker";

export function portalForRole(role: Role): Portal {
  if (role === "owner") return "/owner";
  if (role === "tenant") return "/tenant";
  if (role === ROLE_SERVICE_WORKER) return "/worker";
  return "/admin";
}

/**
 * Roles that require 2FA on sign-in (internal/staff roles per the PRD).
 *
 * Service workers count: they are staff, they see customer addresses and phone
 * numbers, and the seed convention gives every staff login the same 2FA code.
 */
export function requires2fa(role: Role): boolean {
  return adminRoles.includes(role) || role === ROLE_SERVICE_WORKER;
}

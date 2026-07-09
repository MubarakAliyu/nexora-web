/**
 * Role model (per the Nexora PRD). Internal/staff roles all live in the /admin
 * portal; owners and tenants get their own portals.
 */

export type Role =
  | "super_admin"
  | "ops_manager"
  | "property_manager"
  | "maintenance_officer"
  | "finance_officer"
  | "owner"
  | "tenant";

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  ops_manager: "Operations Manager",
  property_manager: "Property Manager",
  maintenance_officer: "Maintenance Officer",
  finance_officer: "Finance Officer",
  owner: "Owner",
  tenant: "Tenant",
};

export const adminRoles: Role[] = [
  "super_admin",
  "ops_manager",
  "property_manager",
  "maintenance_officer",
  "finance_officer",
];

export const allRoles: Role[] = [...adminRoles, "owner", "tenant"];

export type Portal = "/admin" | "/owner" | "/tenant";

export function portalForRole(role: Role): Portal {
  if (role === "owner") return "/owner";
  if (role === "tenant") return "/tenant";
  return "/admin";
}

/** Roles that require 2FA on sign-in (internal/staff roles per the PRD). */
export function requires2fa(role: Role): boolean {
  return adminRoles.includes(role);
}

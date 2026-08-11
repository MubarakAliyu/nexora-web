import {
  Grid,
  Building,
  Home,
  Users,
  UserCircle,
  FileLines,
  Cash,
  CreditCardPlus,
  ChartLineUp,
  AdjustmentsHorizontal,
  ClipboardList,
  Bullhorn,
  Bell,
  Cog,
  UsersGroup,
  Wallet,
  CalendarMonth,
  CalendarWeek,
  FileDoc,
} from "flowbite-react-icons/outline";
import type { SidebarItem } from "@/components/ui/sidebar";
import type { Role } from "@/lib/roles";

const sz = 20;

/** Nav items per role. Some routes are built in later batches (9–11) — the
 *  shell and navigation exist now; those pages arrive with their batch. */
export function navForRole(role: Role): SidebarItem[] {
  if (role === "owner") {
    return [
      { label: "Dashboard", href: "/owner", icon: <Grid size={sz} /> },
      { label: "My Properties", href: "/owner/properties", icon: <Building size={sz} /> },
      { label: "Financials", href: "/owner/financials", icon: <Cash size={sz} /> },
      { label: "My Agreement", href: "/owner/agreement", icon: <FileDoc size={sz} /> },
      { label: "Reports", href: "/owner/reports", icon: <FileLines size={sz} /> },
      { label: "Documents", href: "/owner/documents", icon: <FileLines size={sz} /> },
      { label: "Notifications", href: "/owner/notifications", icon: <Bell size={sz} /> },
      { label: "Settings", href: "/owner/settings", icon: <Cog size={sz} /> },
    ];
  }

  if (role === "tenant") {
    return [
      { label: "Dashboard", href: "/tenant", icon: <Grid size={sz} /> },
      { label: "My Lease", href: "/tenant/lease", icon: <FileLines size={sz} /> },
      { label: "Rent & Payments", href: "/tenant/payments", icon: <CreditCardPlus size={sz} /> },
      { label: "Maintenance", href: "/tenant/maintenance", icon: <AdjustmentsHorizontal size={sz} /> },
      { label: "My Bookings", href: "/tenant/bookings", icon: <CalendarMonth size={sz} /> },
      { label: "Documents", href: "/tenant/documents", icon: <FileLines size={sz} /> },
      { label: "Notifications", href: "/notifications", icon: <Bell size={sz} /> },
      { label: "Settings", href: "/settings", icon: <Cog size={sz} /> },
    ];
  }

  // Internal / admin portal — items shown depend on the staff role.
  const all: Record<string, SidebarItem> = {
    dashboard: { label: "Dashboard", href: "/admin", icon: <Grid size={sz} /> },
    properties: { label: "Properties", href: "/admin/properties", icon: <Building size={sz} /> },
    units: { label: "Units", href: "/admin/units", icon: <Home size={sz} /> },
    owners: { label: "Owners", href: "/admin/owners", icon: <UserCircle size={sz} /> },
    agreements: { label: "Agreements", href: "/admin/agreements", icon: <FileDoc size={sz} /> },
    tenants: { label: "Tenants", href: "/admin/tenants", icon: <Users size={sz} /> },
    leases: { label: "Leases", href: "/admin/leases", icon: <FileLines size={sz} /> },
    finance: { label: "Finance", href: "/admin/finance", icon: <Cash size={sz} /> },
    wallet: { label: "Wallet", href: "/admin/wallet", icon: <Wallet size={sz} /> },
    maintenance: { label: "Maintenance", href: "/admin/maintenance", icon: <AdjustmentsHorizontal size={sz} /> },
    leads: { label: "CRM / Leads", href: "/admin/leads", icon: <ClipboardList size={sz} /> },
    bookings: { label: "Bookings", href: "/admin/bookings", icon: <CalendarMonth size={sz} /> },
    serviceBookings: { label: "Service Bookings", href: "/admin/service-bookings", icon: <CalendarWeek size={sz} /> },
    analytics: { label: "Analytics", href: "/admin/analytics", icon: <ChartLineUp size={sz} /> },
    announcements: { label: "Announcements", href: "/admin/announcements", icon: <Bullhorn size={sz} /> },
    staff: { label: "Staff", href: "/admin/staff", icon: <UsersGroup size={sz} /> },
    settings: { label: "Settings", href: "/admin/settings", icon: <Cog size={sz} /> },
  };

  const keysByRole: Record<Role, string[]> = {
    super_admin: Object.keys(all),
    ops_manager: Object.keys(all),
    property_manager: ["dashboard", "properties", "units", "owners", "agreements", "tenants", "leases", "maintenance", "leads", "bookings", "serviceBookings"],
    maintenance_officer: ["dashboard", "maintenance", "properties"],
    finance_officer: ["dashboard", "finance", "owners", "agreements", "analytics", "announcements"],
    owner: [],
    tenant: [],
  };

  return (keysByRole[role] ?? Object.keys(all)).map((k) => all[k]);
}

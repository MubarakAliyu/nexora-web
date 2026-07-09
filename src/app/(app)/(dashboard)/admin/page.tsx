import { Building, Home, Cash, AdjustmentsHorizontal } from "flowbite-react-icons/outline";
import { DashboardStub } from "@/components/app/dashboard-stub";

export default function AdminDashboardPage() {
  return (
    <DashboardStub
      title="Admin Dashboard"
      subtitle="Operations overview across the portfolio"
      stats={[
        { label: "Units managed", value: "1,200", icon: <Building size={22} />, trend: { value: "8.2%", direction: "up" }, hint: "vs last quarter" },
        { label: "Occupancy", value: "95%", icon: <Home size={22} /> },
        { label: "Monthly revenue", value: "UGX 340M", icon: <Cash size={22} />, trend: { value: "3.1%", direction: "up" } },
        { label: "Open tickets", value: "8", icon: <AdjustmentsHorizontal size={22} /> },
      ]}
      note="The full Admin dashboard — KPI tiles, occupancy & revenue charts, recent activity and alerts, plus Properties, Units, Owners, Tenants, Leases, Finance, Maintenance, CRM, Analytics, Announcements and Settings — is built in Batch 9. The app shell, role-aware navigation, notifications, profile and settings are live now."
    />
  );
}

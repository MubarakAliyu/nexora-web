import { Building, Home, Cash, ChartLineUp } from "flowbite-react-icons/outline";
import { DashboardStub } from "@/components/app/dashboard-stub";

export default function OwnerDashboardPage() {
  return (
    <DashboardStub
      title="Owner Dashboard"
      subtitle="Your portfolio at a glance"
      stats={[
        { label: "Portfolio value", value: "UGX 4.2B", icon: <ChartLineUp size={22} />, trend: { value: "5.4%", direction: "up" }, hint: "year to date" },
        { label: "Occupancy", value: "96%", icon: <Home size={22} /> },
        { label: "Properties", value: "5", icon: <Building size={22} /> },
        { label: "Outstanding", value: "UGX 12M", icon: <Cash size={22} />, trend: { value: "2.1%", direction: "down" } },
      ]}
      note="The full Owner portal — per-property occupancy & revenue, financials, downloadable statements and documents — is built in Batch 10. Navigation, notifications, profile and settings are live now."
    />
  );
}

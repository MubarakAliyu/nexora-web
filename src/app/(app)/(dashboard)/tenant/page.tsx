import { Cash, Clock, AdjustmentsHorizontal, FileLines } from "flowbite-react-icons/outline";
import { DashboardStub } from "@/components/app/dashboard-stub";

export default function TenantDashboardPage() {
  return (
    <DashboardStub
      title="Tenant Dashboard"
      subtitle="Your home, simplified"
      stats={[
        { label: "Balance due", value: "UGX 0", icon: <Cash size={22} /> },
        { label: "Next rent due", value: "Jul 31", icon: <Clock size={22} /> },
        { label: "Open requests", value: "1", icon: <AdjustmentsHorizontal size={22} /> },
        { label: "Lease status", value: "Active", icon: <FileLines size={22} /> },
      ]}
      note="The full Tenant portal — lease summary, rent & payments with a pay-now flow, maintenance requests, complaints and documents — is built in Batch 11. Navigation, notifications, profile and settings are live now."
    />
  );
}

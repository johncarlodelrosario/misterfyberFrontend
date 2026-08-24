// app/admin/applications/page.tsx - COMPLETE
import ApplicationTable from "@/components/admin/ApplicationTable";

export const metadata = {
  title: "Applications - MisterFyber Admin",
  description: "Manage customer applications",
};

export default function ApplicationsPage() {
  return <ApplicationTable />;
}

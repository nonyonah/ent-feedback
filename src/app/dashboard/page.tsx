import type { Metadata } from "next";
import { DashboardView } from "@/components/feedback/dashboard-view";

export const metadata: Metadata = {
  title: "Feedback inbox · Ent Feedback",
};

export default function DashboardPage() {
  return <DashboardView />;
}

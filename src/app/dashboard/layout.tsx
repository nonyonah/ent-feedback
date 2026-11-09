import {BillingCacheProvider} from "@/components/feedback/billing-cache";
import {readBillingSummary} from "@/server/billing/summary";
import {DashboardLoading} from "@/components/feedback/dashboard-loading";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { WorkspaceGate, WorkspaceSync } from "@/components/feedback/workspace-sync";
import {getRegistrationState} from "@/server/onboarding";
import { getOptionalAppUser } from "@/server/auth";

export const instant = false;

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getOptionalAppUser();

  if (!user) {
    redirect("/auth?next=%2Fdashboard");
  }

  const {progress,workspaces}=await getRegistrationState();
  if(!workspaces.length||(!progress.complete&&progress.workspaceId))redirect("/registration");

  const billing=Object.fromEntries(await Promise.all(workspaces.map(async workspace=>[workspace.id,await readBillingSummary(workspace.id,workspace.role==='owner')])));

  return (
    <>
      <WorkspaceSync redirectWhenEmpty initialWorkspaces={workspaces}/>
      <BillingCacheProvider initial={billing}><WorkspaceGate>{children}</WorkspaceGate></BillingCacheProvider>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoading/>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

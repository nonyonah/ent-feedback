import {SampleBoardsProvider} from "@/components/feedback/sample-controls";
import {OperatorPresence} from '@/components/chat/operator-presence';
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

  const billing=Object.fromEntries(await Promise.all(workspaces.map(async workspace=>[workspace.id,workspace.billing??await readBillingSummary(workspace.id,workspace.role==='owner')])));

  return (
    <>
      <WorkspaceSync redirectWhenEmpty initialWorkspaces={workspaces}/>
      <OperatorPresence/>
      <BillingCacheProvider initial={billing}><WorkspaceGate><SampleBoardsProvider>{children}</SampleBoardsProvider></WorkspaceGate></BillingCacheProvider>
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

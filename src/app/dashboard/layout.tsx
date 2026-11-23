import {SampleBoardsProvider} from "@/components/feedback/sample-controls";
import {OperatorPresence} from '@/components/chat/operator-presence';
import {BillingCacheProvider} from "@/components/feedback/billing-cache";
import {readBillingSummary} from "@/server/billing/summary";
import {DashboardView} from "@/components/feedback/dashboard-view";
import {DashboardLoading} from "@/components/feedback/dashboard-loading";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { WorkspaceGate, WorkspaceSync } from "@/components/feedback/workspace-sync";
import {getRegistrationState} from "@/server/onboarding";
import { getOptionalAppUser } from "@/server/auth";
import {needsWorkspaceRegistration} from "@/lib/registration-state";

export const instant = false;

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getOptionalAppUser();

  if (!user) {
    redirect("/auth?next=%2Fdashboard");
  }

  const {progress,workspaces}=await getRegistrationState();
  if(needsWorkspaceRegistration({hasWorkspace:workspaces.length>0,complete:progress.complete,hasSetupWorkspace:Boolean(progress.workspaceId)}))redirect("/registration");

  const billing=Object.fromEntries(await Promise.all(workspaces.map(async workspace=>[workspace.id,workspace.billing??await readBillingSummary(workspace.id,workspace.role==='owner')])));

  return (
    <>
      <WorkspaceSync redirectWhenEmpty initialWorkspaces={workspaces}/>
      <OperatorPresence/>
      <BillingCacheProvider initial={billing}><WorkspaceGate><SampleBoardsProvider><DashboardView>{children}</DashboardView></SampleBoardsProvider></WorkspaceGate></BillingCacheProvider>
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

import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {dashboardReturnPath} from "@/lib/auth-flow";
import {getRegistrationState} from "@/server/onboarding";
import {RegistrationWizard} from "@/components/feedback/registration-wizard";

export const instant=false;

const defaultNext="/dashboard/boards?tour=welcome";

export default async function Page({searchParams}:{searchParams:Promise<{next?:string|string[]}>}){
  // Workspace setup always finishes in management, never on a public board.
  const requested=dashboardReturnPath((await searchParams).next);
  const next=requested==="/dashboard/boards"?defaultNext:requested;
  const {userId}=await auth();

  if(!userId)redirect('/auth?mode=signup&intent=workspace&next='+encodeURIComponent(next));

  const state=await getRegistrationState();

  if(state.progress.complete)redirect(next);
  if(state.workspaces.length>0&&!state.progress.workspaceId)redirect(next);

  return <RegistrationWizard initialStep={state.workspace?state.progress.step:Math.min(state.progress.step,1)} initialWorkspace={state.workspace?{id:state.workspace.id,name:state.workspace.name,handle:state.workspace.handle,website:state.workspace.website}:null} next={next}/>;
}

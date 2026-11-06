import {redirect} from 'next/navigation';
import {auth} from '@clerk/nextjs/server';
import {authIntent,publicReturnPath,workspaceAuthDestination} from '@/lib/auth-flow';
import {safeRedirectPath} from '@/lib/safe-redirect';
import {getRegistrationState} from '@/server/onboarding';
export const instant=false;
export default async function Page({searchParams}:{searchParams:Promise<{intent?:string|string[];next?:string|string[]}>}){
 const params=await searchParams;
 const intent=authIntent(params.intent);
 const next=intent==='public'?publicReturnPath(params.next):safeRedirectPath(params.next,'/dashboard/boards');
 const {userId}=await auth();
 if(!userId)redirect('/auth?'+new URLSearchParams({intent,next}).toString());
 // Board participation never starts or resumes workspace onboarding.
 if(intent==='public')redirect(next);
 const {progress,workspaces}=await getRegistrationState();
 redirect(workspaceAuthDestination({next,hasWorkspace:workspaces.length>0,onboardingPending:!progress.complete&&Boolean(progress.workspaceId)}));
}

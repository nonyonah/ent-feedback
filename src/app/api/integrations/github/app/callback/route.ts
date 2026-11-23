import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {seal,unseal,verifyOAuthState} from '@/server/integration-crypto';
import {githubAppState} from '@/server/connected-apps/github-app';
export async function GET(request:Request){
 const e=getServerEnv(),destination=new URL('/dashboard/changelog?github=error',e.NEXT_PUBLIC_APP_URL),jar=await cookies(),cookie=jar.get('ent-github-app')?.value;jar.set('ent-github-app','',{path:'/api/integrations/github/app',maxAge:0});
 try{const key=e.INTEGRATION_ENCRYPTION_KEY;if(!key||!e.GITHUB_APP_CLIENT_ID||!e.GITHUB_APP_CLIENT_SECRET)throw Error();const state=githubAppState.parse(unseal(cookie??'',key,'github-app')),url=new URL(request.url),user=await requireAppUser();verifyOAuthState({...state,provider:'github'},{provider:'github',userId:user.id,nonce:url.searchParams.get('state')??''});await requireWorkspaceRole(getDb(),{workspaceId:state.workspaceId,userId:user.id,minimumRole:'admin'});const installationId=z.string().regex(/^\d+$/).parse(state.installationId),code=z.string().min(1).parse(url.searchParams.get('code'));const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.GITHUB_APP_CLIENT_ID,client_secret:e.GITHUB_APP_CLIENT_SECRET,code,code_verifier:state.verifier,redirect_uri:new URL('/api/integrations/github/app/callback',e.NEXT_PUBLIC_APP_URL).href}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const token=z.object({access_token:z.string().min(1).max(1024)}).parse(await response.json()).access_token;jar.set('ent-github-selection',seal({userId:user.id,workspaceId:state.workspaceId,installationId,token,expires:Date.now()+600000},key,'github-selection'),{httpOnly:true,secure:new URL(e.NEXT_PUBLIC_APP_URL).protocol==='https:',sameSite:'lax',path:'/',maxAge:600});destination.searchParams.set('github','choose');}catch{/* Never expose OAuth credentials or provider responses. */}return NextResponse.redirect(destination);
}

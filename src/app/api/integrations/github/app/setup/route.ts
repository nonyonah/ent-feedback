import {cookies} from 'next/headers';
import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {seal,unseal,verifyOAuthState} from '@/server/integration-crypto';
import {githubAppState} from '@/server/connected-apps/github-app';
export async function GET(request:Request){
 const e=getServerEnv(),destination=new URL('/dashboard/changelog?github=error',e.NEXT_PUBLIC_APP_URL),jar=await cookies();
 try{const key=e.INTEGRATION_ENCRYPTION_KEY;if(!key||!e.GITHUB_APP_CLIENT_ID)throw Error();const state=githubAppState.parse(unseal(jar.get('ent-github-app')?.value??'',key,'github-app')),url=new URL(request.url),user=await requireAppUser();verifyOAuthState({...state,provider:'github'},{provider:'github',userId:user.id,nonce:url.searchParams.get('state')??''});await requireWorkspaceRole(getDb(),{workspaceId:state.workspaceId,userId:user.id,minimumRole:'admin'});const installationId=z.string().regex(/^\d+$/).parse(url.searchParams.get('installation_id'));jar.set('ent-github-app',seal({...state,installationId},key,'github-app'),{httpOnly:true,secure:new URL(e.NEXT_PUBLIC_APP_URL).protocol==='https:',sameSite:'lax',path:'/api/integrations/github/app',maxAge:600});const authorize=new URL('https://github.com/login/oauth/authorize');authorize.search=new URLSearchParams({client_id:e.GITHUB_APP_CLIENT_ID,redirect_uri:new URL('/api/integrations/github/app/callback',e.NEXT_PUBLIC_APP_URL).href,state:state.nonce,code_challenge:createHash('sha256').update(state.verifier).digest('base64url'),code_challenge_method:'S256'}).toString();return NextResponse.redirect(authorize);}catch{return NextResponse.redirect(destination);}
}

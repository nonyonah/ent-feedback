import 'server-only';
import {randomBytes,createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {connectedProviderSchema,type ConnectedProvider} from '@/lib/connected-apps';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {connectedApps,discordIdentities} from '@/server/db/schema';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {seal,unseal,verifyOAuthState} from '@/server/integration-crypto';
import {ServiceError} from '@/server/result';
import {appConfig,appFetch,appEnabled} from './config';
import {linearCredentials,linearToken,linearGraph} from './linear';
import {resolveAnalyticsBoard,trackServerAnalytics} from '@/lib/analytics/server';
export const discordCredentials=z.object({accessToken:z.string(),refreshToken:z.string(),webhookId:z.string().regex(/^\d+$/),webhookToken:z.string().min(1),channelId:z.string().regex(/^\d+$/)});
const stateSchema=z.object({nonce:z.string(),userId:z.uuid(),workspaceId:z.uuid(),provider:connectedProviderSchema,expires:z.number(),verifier:z.string(),identity:z.boolean()});
export async function startAppOAuth(provider:ConnectedProvider,workspaceId:string,identity=false){
 const user=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId,userId:user.id,minimumRole:identity&&provider==='discord'?'member':'admin'});const c=appConfig(provider);
 const nonce=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url'),jar=await cookies();
 jar.set('ent-app-oauth-'+provider,seal({nonce,userId:user.id,workspaceId,provider,expires:Date.now()+600000,verifier,identity},c.key,'connected-oauth:'+provider),{httpOnly:true,secure:new URL(c.redirectUri).protocol==='https:',sameSite:'lax',path:'/api/integrations/'+provider,maxAge:600});
 const url=new URL(provider==='linear'?'https://linear.app/oauth/authorize':'https://discord.com/oauth2/authorize');url.search=new URLSearchParams({client_id:c.id,redirect_uri:c.redirectUri,response_type:'code',state:nonce,scope:provider==='linear'?'read,issues:create':identity?'identify':'identify webhook.incoming bot',...(provider==='linear'?{actor:'app',prompt:'consent',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}:identity?{}:{permissions:'117760'})}).toString();return {url:url.href};
}
export async function appOAuthCallback(provider:ConnectedProvider,request:Request){
 if(!appEnabled(provider))return new Response('Unavailable',{status:404});const env=getServerEnv(),destination=new URL('/dashboard/settings/integrations',env.NEXT_PUBLIC_APP_URL);destination.searchParams.set('connection',provider);destination.searchParams.set('result','error');
 const jar=await cookies(),cookie=jar.get('ent-app-oauth-'+provider)?.value;jar.set('ent-app-oauth-'+provider,'',{path:'/api/integrations/'+provider,maxAge:0});
 try{
 const c=appConfig(provider),s=stateSchema.parse(unseal(cookie??'',c.key,'connected-oauth:'+provider)),url=new URL(request.url),user=await requireAppUser();
 verifyOAuthState(s,{nonce:url.searchParams.get('state')??'',provider,userId:user.id});await requireWorkspaceRole(getDb(),{workspaceId:s.workspaceId,userId:user.id,minimumRole:s.identity&&provider==='discord'?'member':'admin'});
 if(url.searchParams.has('error')){destination.searchParams.set('result','cancelled');return NextResponse.redirect(destination);}const code=url.searchParams.get('code');if(!code)throw Error();
 const issuer=url.searchParams.get('iss');if(provider==='discord'&&issuer&&issuer!=='https://discord.com')throw Error();
 const r=await appFetch(provider==='linear'?'https://api.linear.app/oauth/token':'https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.id,client_secret:c.secret,redirect_uri:c.redirectUri,grant_type:'authorization_code',code,...(provider==='linear'?{code_verifier:s.verifier}:{})})});
 const t=z.object({access_token:z.string().min(1),refresh_token:z.string().min(1),expires_in:z.number().positive(),webhook:z.object({id:z.string().regex(/^\d+$/),token:z.string().min(1),channel_id:z.string().regex(/^\d+$/),guild_id:z.string().regex(/^\d+$/),name:z.string().nullable().optional()}).optional()}).parse(await r.json());
 let externalId:string,label:string,credentials:unknown;
 if(provider==='linear'){
 const data=await linearGraph<{organization:{id:string;name:string}}>(t.access_token,'query{organization{id name}}');externalId=z.uuid().parse(data.organization.id);label=data.organization.name;credentials=linearCredentials.parse({accessToken:t.access_token,refreshToken:t.refresh_token,expiresAt:Date.now()+t.expires_in*1000});
 }else{
 const profile=z.object({id:z.string().regex(/^\d+$/)}).parse(await (await appFetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bearer '+t.access_token}})).json());
 if(!s.identity&&!t.webhook)throw Error();
 // Linking is explicit OAuth proof of identity, never a Discord display-name/email guess.
 await getDb().insert(discordIdentities).values({workspaceId:s.workspaceId,userId:user.id,discordUserId:profile.id}).onConflictDoUpdate({target:[discordIdentities.workspaceId,discordIdentities.userId],set:{discordUserId:profile.id}});
 if(s.identity){destination.searchParams.set('result','connected');return NextResponse.redirect(destination);}
 externalId=t.webhook!.guild_id;label=t.webhook!.name??'Discord channel';credentials=discordCredentials.parse({accessToken:t.access_token,refreshToken:t.refresh_token,webhookId:t.webhook!.id,webhookToken:t.webhook!.token,channelId:t.webhook!.channel_id});
 }
 await getDb().transaction(async tx=>{
 // Reconnection keeps links only for the same external organization/server.
 const [existing]=await tx.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,s.workspaceId),eq(connectedApps.provider,provider))).for('update');
 if(existing&&existing.externalId!==externalId)await tx.delete(connectedApps).where(eq(connectedApps.id,existing.id));
 await tx.insert(connectedApps).values({workspaceId:s.workspaceId,provider,externalId,label,encryptedCredentials:seal(credentials,c.key,s.workspaceId+':'+provider),createdByUserId:user.id}).onConflictDoUpdate({target:[connectedApps.workspaceId,connectedApps.provider],set:{externalId,label,encryptedCredentials:seal(credentials,c.key,s.workspaceId+':'+provider),connected:true,updatedAt:new Date()}});
  });const boardId=await resolveAnalyticsBoard(s.workspaceId);trackServerAnalytics('integration_enabled',{type:provider},{boardId,user:{id:user.id,clerkUserId:user.clerkUserId}});destination.searchParams.set('result','connected');
  }catch{/* Never put OAuth codes, tokens or provider error bodies in redirects/logs. */}
 return NextResponse.redirect(destination);
}
export async function disconnectApp(provider:ConnectedProvider,workspaceId:string){
 const user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'admin'});const c=appConfig(provider);
 const [row]=await db.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,workspaceId),eq(connectedApps.provider,provider),eq(connectedApps.connected,true)));if(!row?.encryptedCredentials)return;
 if(provider==='linear'){const {token}=await linearToken(row.id);await appFetch('https://api.linear.app/oauth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});}
 else{const secret=discordCredentials.parse(unseal(row.encryptedCredentials,c.key,workspaceId+':discord'));const response=await fetch(`https://discord.com/api/v10/webhooks/${secret.webhookId}/${encodeURIComponent(secret.webhookToken)}`,{method:'DELETE',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok&&response.status!==404)throw new ServiceError('retryable','Discord could not disconnect.');await appFetch('https://discord.com/api/v10/oauth2/token/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.id,client_secret:c.secret,token:secret.accessToken})});}
 await db.update(connectedApps).set({connected:false,encryptedCredentials:null,updatedAt:new Date()}).where(and(eq(connectedApps.id,row.id),eq(connectedApps.updatedAt,row.updatedAt)));
}

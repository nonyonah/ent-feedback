import 'server-only';
import {createHash} from 'node:crypto';
import {after} from 'next/server';
import {PostHog} from 'posthog-node';
import {and,asc,eq,isNull} from 'drizzle-orm';
import {getServerEnv} from '@/server/env';
import {getDb} from '@/server/db/client';
import {boards,users,workspaces,workspaceMembers} from '@/server/db/schema';
import {getWorkspaceEntitlements} from '@/server/billing/access';
import {safeAnalyticsProperties,type AnalyticsEvent,type AnalyticsProperties} from '@/lib/analytics-events';

export type AnalyticsUser={id:string;email?:string|null;isInternal?:boolean};
export type AnalyticsBoardContext={boardId?:string|null;user?:AnalyticsUser|null;visitorId?:string|null;defer?:boolean};
type BoardAnalyticsInput={workspaceId:string;boardId:string;originDomain:string;isExternal:boolean};
let client:PostHog|undefined;

function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function analyticsConfigured(){const env=getServerEnv();return env.ANALYTICS_ENABLED==='true'&&Boolean(env.POSTHOG_SERVER_KEY);}
function getClient(){
  if(!analyticsConfigured())return undefined;
  if(!client){const env=getServerEnv();client=new PostHog(env.POSTHOG_SERVER_KEY!,{host:env.POSTHOG_SERVER_HOST??env.NEXT_PUBLIC_POSTHOG_HOST??'https://eu.i.posthog.com',flushAt:1,flushInterval:10000,disableGeoip:true});}
  return client;
}
export function hashAnalyticsUser(userId:string){return 'ent-user-'+hash('ent-analytics:v1:'+userId);}
export function hashAnalyticsVisitor(visitorId:string,boardId:string){
  const salt=getServerEnv().ANALYTICS_VISITOR_SALT;
  if(!salt)return undefined;
  const value=hash(visitorId+':'+boardId+':'+salt).slice(0,24);
  return 'v_'+value;
}
export function analyticsHostFromHeaders(headers:{get(name:string):string|null}){
  const origin=headers.get('origin');
  if(origin){try{return new URL(origin).hostname.toLowerCase().replace(/^www\./,'');}catch{}}
  const referer=headers.get('referer');
  if(referer){try{return new URL(referer).hostname.toLowerCase().replace(/^www\./,'');}catch{}}
  return undefined;
}
export function isInternalAnalyticsHost(host?:string|null){
  if(!host)return true;
  const configured=(getServerEnv().INTERNAL_HOSTS??'').split(',').map(value=>value.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const internal=new Set(['localhost','127.0.0.1','::1',...(configured)]);
  if(internal.has(host))return true;
  const app=(()=>{try{return new URL(getServerEnv().NEXT_PUBLIC_APP_URL).hostname.toLowerCase().replace(/^www\./,'');}catch{return undefined;}})();
  return Boolean(app&&(host===app||host.endsWith('.'+app)));
}
function isDomain(value?:string|null){return Boolean(value&&value.length<=253&&/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(value)&&!isInternalAnalyticsHost(value));}
function flushWithTimeout(){
  const posthog=getClient();
  if(!posthog)return Promise.resolve();
  return new Promise<void>(resolve=>{
    let settled=false;
    const timer=setTimeout(()=>{if(!settled){settled=true;resolve();}},1500);
    void posthog.flush().then(()=>{if(!settled){settled=true;clearTimeout(timer);resolve();}}).catch(()=>{if(!settled){settled=true;clearTimeout(timer);resolve();}});
  });
}
export async function flushAnalytics(){if(analyticsConfigured())await flushWithTimeout();}
export function trackServerAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties={},context:AnalyticsBoardContext={}){
  const posthog=getClient();
  if(!posthog)return;
  const boardId=context.boardId||undefined;
  const anonymous=userless(context);
  const visitor=boardId&&context.visitorId?hashAnalyticsVisitor(context.visitorId,boardId):undefined;
  if(anonymous&&context.visitorId&&!visitor)return;
  const distinctId=context.user?hashAnalyticsUser(context.user.id):visitor;
  const personless=anonymous&&!distinctId;
  const safe=safeAnalyticsProperties({...properties,environment:getServerEnv().NODE_ENV==='production'?'production':'development',auth_state:context.user&&!personless?'signed_in':'guest'});
  const payload={
    event,
    properties:{...safe,$process_person_profile:!personless},
    ...(distinctId?{distinctId}:{}),
    ...(boardId?{groups:{board:boardId},properties:{...safe,board_id:boardId,$process_person_profile:!personless}}:{}),
    ...(personless||anonymous?{options:{process_person_profile:false}}:{options:{process_person_profile:true}}),
    disableGeoip:true,
  };
  const capture=()=>{try{posthog.capture(payload);}catch{}};
  if(context.defer===false)capture();
  else after(async()=>{capture();await flushWithTimeout();});
}
function userless(context:AnalyticsBoardContext){return !context.user;}
export function identifyAnalyticsUser(user:AnalyticsUser){
  const posthog=getClient();
  if(!posthog||!analyticsConfigured())return;
  const distinctId=hashAnalyticsUser(user.id);
  after(async()=>{
   try{
    posthog.identify({distinctId,properties:{is_internal:Boolean(user.isInternal)},options:{process_person_profile:true},disableGeoip:true});
    await flushWithTimeout();
   }catch{}
  });
}
export function identifyAnalyticsBoard(input:{boardId:string;name:string;ownerEmail?:string|null;createdAt?:Date|string|null;plan:string;widgetInstalled:boolean;installedDomain?:string|null}){
  const posthog=getClient();
  if(!posthog)return;
  after(async()=>{
   try{
    posthog.groupIdentify({groupType:'board',groupKey:input.boardId,properties:{name:input.name,owner_email:input.ownerEmail??undefined,created_at:input.createdAt instanceof Date?input.createdAt.toISOString():input.createdAt??undefined,plan:input.plan,widget_installed:input.widgetInstalled,installed_domain:input.installedDomain??undefined},disableGeoip:true});
    await flushWithTimeout();
   }catch{}
  });
}
export async function resolveAnalyticsBoard(workspaceId:string,boardId?:string|null){
  if(!analyticsConfigured())return undefined;
  const [board]=boardId?await getDb().select({id:boards.id}).from(boards).where(and(eq(boards.id,boardId),eq(boards.workspaceId,workspaceId))).limit(1):await getDb().select({id:boards.id}).from(boards).where(eq(boards.workspaceId,workspaceId)).orderBy(asc(boards.position)).limit(1);
  return board?.id;
}
export async function markWidgetFirstLoaded(input:BoardAnalyticsInput){
  if(!isDomain(input.originDomain)||!input.isExternal)return;
  const db=getDb();
  const [changed]=await db.update(workspaces).set({widgetFirstLoadedAt:new Date(),widgetInstalledDomain:input.originDomain}).where(and(eq(workspaces.id,input.workspaceId),isNull(workspaces.widgetFirstLoadedAt))).returning({id:workspaces.id,name:workspaces.name,createdAt:workspaces.createdAt});
  if(!changed){
    await db.update(workspaces).set({widgetInstalledDomain:input.originDomain}).where(and(eq(workspaces.id,input.workspaceId),isNull(workspaces.widgetInstalledDomain)));
    return;
  }
  if(!analyticsConfigured())return;
  const [owner]=await db.select({email:users.email}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,input.workspaceId),eq(workspaceMembers.role,'owner'))).limit(1);
  const entitlements=await getWorkspaceEntitlements(input.workspaceId);
  identifyAnalyticsBoard({boardId:input.boardId,name:changed.name,ownerEmail:owner?.email,createdAt:changed.createdAt,plan:entitlements.plan,widgetInstalled:true,installedDomain:input.originDomain});
  trackServerAnalytics('widget_first_loaded',{origin_domain:input.originDomain,is_external:true},{boardId:input.boardId});
}

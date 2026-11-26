import 'server-only';
import {createHash} from 'node:crypto';
import {after} from 'next/server';
import {cookies,headers} from 'next/headers';
import {PostHog} from 'posthog-node';
import {z} from 'zod';
import {and,asc,eq,isNull} from 'drizzle-orm';
import {getServerEnv} from '@/server/env';
import {getDb} from '@/server/db/client';
import {boards,workspaces} from '@/server/db/schema';
import {safeAnalyticsProperties,type AnalyticsEvent,type AnalyticsProperties} from '@/lib/analytics-events';

export type AnalyticsUser={id:string;clerkUserId:string;email?:string|null;name?:string|null;isInternal?:boolean};
export type AnalyticsBoardContext={boardId?:string|null;user?:AnalyticsUser|null;visitorId?:string|null;defer?:boolean;hostConsent?:boolean};
type BoardAnalyticsInput={workspaceId:string;boardId:string;originDomain:string;isExternal:boolean};
let client:PostHog|undefined;

function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function analyticsConfigured(){const env=getServerEnv();return env.ANALYTICS_ENABLED==='true'&&Boolean(env.POSTHOG_SERVER_KEY||env.NEXT_PUBLIC_POSTHOG_KEY);}
function getClient(){
  if(!analyticsConfigured())return undefined;
  if(!client){const env=getServerEnv();client=new PostHog((env.POSTHOG_SERVER_KEY||env.NEXT_PUBLIC_POSTHOG_KEY)!,{host:env.POSTHOG_SERVER_HOST??env.NEXT_PUBLIC_POSTHOG_HOST,flushAt:1,flushInterval:10000,requestTimeout:1500,fetchRetryCount:0,disableGeoip:true,privacyMode:false,enableExceptionAutocapture:process.env.NEXT_RUNTIME==='nodejs'});}
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
/** AI Observability captures use anonymous session IDs and never create person profiles. */
export async function captureAiGeneration(distinctId:string,properties:Record<string,unknown>){
  const posthog=getClient();
  if(!posthog)return;
  try{posthog.capture({distinctId,event:'$ai_generation',properties,options:{process_person_profile:false},disableGeoip:true});await flushWithTimeout();}catch{}
}
export function trackServerAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties={},context:AnalyticsBoardContext={}){
  const posthog=getClient();
  if(!posthog)return;
  const boardId=context.boardId||undefined;
  const anonymous=userless(context);
  const visitor=boardId&&context.visitorId?hashAnalyticsVisitor(context.visitorId,boardId):undefined;
  if(anonymous&&context.visitorId&&!visitor)return;
  const distinctId=context.user?hashAnalyticsUser(context.user.clerkUserId):visitor;
  const personless=anonymous&&!distinctId;
  const safe=safeAnalyticsProperties({...properties,environment:getServerEnv().NODE_ENV==='production'?'production':'development',auth_state:context.user&&!personless?'signed_in':'guest'});
  const payload={
    event,
    properties:{...safe,$process_person_profile:!anonymous},
    ...(distinctId?{distinctId}:{}),
    ...(boardId?{groups:{board:boardId},properties:{...safe,board_id:boardId,$process_person_profile:!anonymous}}:{}),
    ...(personless||anonymous?{options:{process_person_profile:false}}:{options:{process_person_profile:true}}),
    disableGeoip:true,
  };
  const consent=context.hostConsent===true?hasHostAnalyticsConsent():hasAnalyticsConsent();
  const capture=async()=>{if(!await consent)return;try{posthog.capture(payload);await flushWithTimeout();}catch{}};
  if(context.defer===false)return capture();
  after(capture);
}
async function hasHostAnalyticsConsent(){try{const h=await headers();return h.get('sec-gpc')!=='1'&&h.get('dnt')!=='1';}catch{return false;}}
async function hasAnalyticsConsent(){try{const [jar,requestHeaders]=await Promise.all([cookies(),headers()]);const value=jar.get('ent_analytics_consent')?.value?.split('.')??[];if(value[0]!=='granted')return false;if(requestHeaders.get('sec-gpc')==='1'&&!value.includes('gpc'))return false;if(requestHeaders.get('dnt')==='1'&&!value.includes('dnt'))return false;return true;}catch{return false;}}
function userless(context:AnalyticsBoardContext){return !context.user;}
export function identifyAnalyticsUser(user:AnalyticsUser){
  const posthog=getClient();
  if(!posthog||!analyticsConfigured())return;
  const distinctId=hashAnalyticsUser(user.clerkUserId),consent=hasAnalyticsConsent();
  after(async()=>{
   try{
    if(!await consent)return;
    posthog.identify({distinctId,properties:{email:user.email??undefined,name:user.name??undefined,is_internal:Boolean(user.isInternal)},options:{process_person_profile:true},disableGeoip:true});
    await flushWithTimeout();
   }catch{}
  });
}
export function identifyAnalyticsBoard(input:{boardId:string;name:string;ownerEmail?:string|null;createdAt?:Date|string|null;plan:string;widgetInstalled:boolean;installedDomain?:string|null}){
  const posthog=getClient();
  if(!posthog)return;
  const consent=hasAnalyticsConsent();
  after(async()=>{
   try{
    if(!await consent)return;
    posthog.groupIdentify({groupType:'board',groupKey:input.boardId,properties:{created_at:input.createdAt instanceof Date?input.createdAt.toISOString():input.createdAt??undefined,plan:input.plan,widget_installed:input.widgetInstalled,installed_domain:input.installedDomain??undefined},disableGeoip:true});
    await flushWithTimeout();
   }catch{}
  });
}
/** Resolve the board an event belongs to, by id or handle, falling back to the workspace's first board. */
export async function resolveAnalyticsBoard(workspaceId:string,key?:string|null){
  if(!analyticsConfigured())return undefined;
  const wid=z.uuid().parse(workspaceId);
  const lookup=key?.trim();
  if(lookup){
    const [board]=await getDb().select({id:boards.id}).from(boards)
      .where(and(eq(boards.workspaceId,wid),/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookup)?eq(boards.id,lookup):eq(boards.handle,lookup)))
      .limit(1);
    if(board)return board.id;
  }
  const [fallback]=await getDb().select({id:boards.id}).from(boards).where(eq(boards.workspaceId,wid)).orderBy(asc(boards.position)).limit(1);
  return fallback?.id;
}
export async function markWidgetFirstLoaded(input:BoardAnalyticsInput){
  if(!isDomain(input.originDomain)||!input.isExternal)return;
  const db=getDb();
  const [changed]=await db.update(workspaces).set({widgetFirstLoadedAt:new Date(),widgetInstalledDomain:input.originDomain}).where(and(eq(workspaces.id,input.workspaceId),isNull(workspaces.widgetFirstLoadedAt))).returning({id:workspaces.id,name:workspaces.name,createdAt:workspaces.createdAt});
  if(!changed){
    await db.update(workspaces).set({widgetInstalledDomain:input.originDomain}).where(and(eq(workspaces.id,input.workspaceId),isNull(workspaces.widgetInstalledDomain)));
    return;
  }
}

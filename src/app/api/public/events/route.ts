import {z} from 'zod';
import {getPublicWorkspace} from '@/server/public-workspace';
import {getDb} from '@/server/db/client';
import {analyticsWidgetInstalls} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {boundedBody} from '@/server/connected-apps/security';
import {analyticsHostFromHeaders,hashAnalyticsVisitor,isInternalAnalyticsHost,trackServerAnalytics} from '@/lib/analytics/server';

const bodySchema=z.object({projectKey:z.string().trim().min(2).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),boardKey:z.string().trim().min(1).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),visitorId:z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),type:z.enum(['widget_loaded','widget_opened','roadmap_viewed','feedback_submitted','vote_cast','comment_submitted','chat_started','chat_escalated']),surface:z.enum(['widget','board']).default('widget'),consent:z.literal(true)}).strict();
const buckets=new Map<string,{count:number;resetAt:number}>();
function allow(key:string,limit=8){
 const now=Date.now();let bucket=buckets.get(key);
 if(!bucket||bucket.resetAt<=now){if(buckets.size>=10_000){for(const [entry,value] of buckets)if(value.resetAt<=now)buckets.delete(entry);if(buckets.size>=10_000&&!bucket)return false;}bucket={count:0,resetAt:now+60_000};buckets.set(key,bucket);}
 if(bucket.count>=limit)return false;
 bucket.count++;return true;
}
export async function POST(request:Request){
 try{
  if(request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1')return new Response(null,{status:204});
  const env=getServerEnv();if(env.ANALYTICS_ENABLED!=='true'||!(env.POSTHOG_SERVER_KEY||env.NEXT_PUBLIC_POSTHOG_KEY))return new Response(null,{status:204});
  const body=bodySchema.parse(JSON.parse(await boundedBody(request,4096)));
  const host=analyticsHostFromHeaders(request.headers);if(!host||isInternalAnalyticsHost(host))return new Response(null,{status:204});
  const workspace=await getPublicWorkspace(body.projectKey),board=workspace?.boards.find(item=>item.slug===body.boardKey);
  if(!workspace||!board||!hashAnalyticsVisitor(body.visitorId,board.id))return new Response(null,{status:204});
  if(!allow('board:'+board.id,300)||!allow(board.id+':'+body.visitorId))return new Response(null,{status:204});
  const context={boardId:board.id,visitorId:body.visitorId,hostConsent:true};
  if(body.type==='widget_loaded'){
   trackServerAnalytics('widget_loaded',{source:'widget',surface:body.surface,origin_domain:host,is_external:true},context);
   const [first]=await getDb().insert(analyticsWidgetInstalls).values({workspaceId:workspace.project.id,boardId:board.id}).onConflictDoNothing().returning({boardId:analyticsWidgetInstalls.boardId});
   if(first)trackServerAnalytics('widget_first_loaded',{origin_domain:host,is_external:true},context);
  }else if(body.type==='widget_opened')trackServerAnalytics('widget_opened',{source:'widget',surface:body.surface},context);
  else trackServerAnalytics(body.type,{source:'widget',surface:body.surface},context);
 }catch{}
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
}

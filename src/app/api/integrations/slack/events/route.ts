import {after} from 'next/server';
import {processNotificationJobs} from '@/server/notification-worker';
import {processChatJobs} from '@/server/chat/notifications';
import {getServerEnv} from '@/server/env';
import {getDb} from '@/server/db/client';
import {validSlackSignature,slackEventSchema,queueSlackEvent,slackActionSchema,queueSlackAction} from '@/server/chat/slack';
export const maxDuration=60;
export async function POST(request:Request){
 const secret=getServerEnv().SLACK_SIGNING_SECRET;if(!secret)return new Response('Not configured',{status:503});
 const reader=request.body?.getReader();if(!reader)return new Response('Bad request',{status:400});let raw='',bytes=0;const decoder=new TextDecoder();try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>128000){await reader.cancel();return new Response('Too large',{status:413});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
 if(!validSlackSignature(raw,request.headers.get('x-slack-request-timestamp')??'',request.headers.get('x-slack-signature')??'',secret))return new Response('Unauthorized',{status:401});
 try{const isAction=request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');const value=JSON.parse(isAction?new URLSearchParams(raw).get('payload')??'null':raw);if(isAction){const parsed=slackActionSchema.safeParse(value);if(!parsed.success)return new Response(null,{status:200});await queueSlackAction(getDb(),parsed.data);after(async()=>{await processChatJobs(2);await Promise.allSettled([processChatJobs(2),processNotificationJobs(3)]);});return new Response(null,{status:200});}if(value.type==='url_verification'&&typeof value.challenge==='string')return Response.json({challenge:value.challenge});const parsed=slackEventSchema.safeParse(value);if(!parsed.success)return new Response(null,{status:200});const e=parsed.data.event;if(e.bot_id||!e.user||!e.thread_ts||e.subtype&&e.subtype!=='file_share')return new Response(null,{status:200});await queueSlackEvent(getDb(),parsed.data,parsed.data.event_id);after(async()=>{await processChatJobs(2);await Promise.allSettled([processChatJobs(2),processNotificationJobs(3)]);});return new Response(null,{status:200});}catch{return new Response('Retry later',{status:503});}
}

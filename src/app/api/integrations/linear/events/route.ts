import {after} from 'next/server';
import {processIntegrationJobs} from '@/server/connected-apps/worker';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {jobs} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {appEnabled} from '@/server/connected-apps/config';
import {boundedBody,validLinearSignature} from '@/server/connected-apps/security';
const event=z.object({webhookTimestamp:z.number(),organizationId:z.string(),type:z.string(),action:z.string(),data:z.record(z.string(),z.unknown()).optional()});
export const maxDuration=60;
export async function POST(request:Request){
 if(!appEnabled('linear'))return new Response('Unavailable',{status:404});
 try{const body=await boundedBody(request),p=event.parse(JSON.parse(body)),secret=getServerEnv().LINEAR_WEBHOOK_SECRET;if(!secret||!validLinearSignature(body,request.headers.get('linear-signature')??'',secret,p.webhookTimestamp))return new Response('Unauthorized',{status:401});
 // Exclude delivery timestamp so provider retries have the same receipt key.
 const key='linear:'+createHash('sha256').update(JSON.stringify({organizationId:p.organizationId,type:p.type,action:p.action,data:p.data})).digest('hex');
 await getDb().insert(jobs).values({type:'integration_delivery',dedupeKey:key,payload:{kind:'linear_event',event:p}}).onConflictDoNothing();after(()=>processIntegrationJobs(2).then(()=>undefined));return Response.json({received:true});
 }catch{return Response.json({error:'Event could not be accepted.'},{status:503});}
}

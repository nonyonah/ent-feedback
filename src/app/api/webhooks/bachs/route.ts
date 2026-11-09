import {z} from 'zod';
import {webhooks} from '@bachs/sdk';
import {getServerEnv} from '@/server/env';
import {applyBillingEvent} from '@/server/billing/webhook';
export const maxDuration=60;
export async function POST(request:Request){
 const secret=getServerEnv().BACHS_WEBHOOK_SECRET;
 if(!secret)return Response.json({error:'Billing webhooks are not configured.'},{status:503});
 if(Number(request.headers.get('content-length')??0)>256*1024)return new Response(null,{status:413});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 const parts:Uint8Array[]=[];let length=0;
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>256*1024){await reader.cancel();return new Response(null,{status:413});}parts.push(value);}
 let event;
 try{event=webhooks.constructEvent(Buffer.concat(parts),request.headers,secret,{toleranceSeconds:300});}catch{return Response.json({error:'Invalid billing signature.'},{status:400});}
 try{await applyBillingEvent(event);return Response.json({received:true});}catch(error){
  // Log identifiers and validation paths only; never payloads, customer data, or secrets.
  console.error('Billing webhook processing failed',{eventId:event.id,type:event.type,errorType:error instanceof Error?error.name:'UnknownError',...(error instanceof z.ZodError?{fields:error.issues.map(issue=>issue.path.join('.'))}:{})});
  return Response.json({error:'Billing update could not be applied. Retry this event.'},{status:503});}
}

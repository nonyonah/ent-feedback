import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {captureAiGeneration} from '@/lib/analytics/server';
import {getServerEnv} from '@/server/env';
import {boundedBody} from '@/server/connected-apps/security';

const responseSchema=z.object({choices:z.array(z.object({message:z.object({content:z.string().max(12000)})})).min(1).max(4),usage:z.object({prompt_tokens:z.number().int().nonnegative().optional(),completion_tokens:z.number().int().nonnegative().optional()}).optional()});

/** The application, not the model, owns all authorization and side effects. */
export async function jsonCompletion(system:string,input:unknown):Promise<unknown>{
 const env=getServerEnv();
 if(!env.AI_BASE_URL||!env.AI_API_KEY||!env.AI_MODEL)throw Error('AI provider is unavailable');
 const base=new URL(env.AI_BASE_URL);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Invalid AI provider URL');
 const endpoint=new URL(base.href.replace(/\/$/,'')+'/chat/completions');
 const messages=[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}];
 const traceId=randomUUID(),started=Date.now();
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.AI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.AI_MODEL,temperature:0,max_tokens:1024,response_format:{type:'json_object'},messages}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok||Number(response.headers.get('content-length')??0)>50000)throw Error('AI provider request failed');
 const parsed=responseSchema.parse(JSON.parse(await boundedBody(response,50000)));
 const content=parsed.choices[0].message.content;
 await captureAiGeneration(traceId,{$ai_trace_id:traceId,$ai_session_id:null,$ai_span_name:'structured_completion',$ai_model:env.AI_MODEL,$ai_input:messages,$ai_output_choices:[{role:'assistant',content}],$ai_input_tokens:parsed.usage?.prompt_tokens,$ai_output_tokens:parsed.usage?.completion_tokens,$ai_latency:(Date.now()-started)/1000,$ai_http_status:response.status,$ai_base_url:base.href,$ai_request_url:endpoint.href,$ai_temperature:0,$ai_max_tokens:1024});
 return JSON.parse(content) as unknown;
}

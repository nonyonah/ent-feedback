import 'server-only';
import {z} from 'zod';
import {getServerEnv} from '@/server/env';
import {boundedBody} from '@/server/connected-apps/security';

const responseSchema=z.object({choices:z.array(z.object({message:z.object({content:z.string().max(12000)})})).min(1).max(4)});

/** The application, not the model, owns all authorization and side effects. */
export async function jsonCompletion(system:string,input:unknown):Promise<unknown>{
 const env=getServerEnv();
 if(!env.AI_BASE_URL||!env.AI_API_KEY||!env.AI_MODEL)throw Error('AI provider is unavailable');
 const base=new URL(env.AI_BASE_URL);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Invalid AI provider URL');
 const endpoint=new URL(base.href.replace(/\/$/,'')+'/chat/completions');
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.AI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.AI_MODEL,temperature:0,max_tokens:1024,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}]}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok||Number(response.headers.get('content-length')??0)>50000)throw Error('AI provider request failed');
 const parsed=responseSchema.parse(JSON.parse(await boundedBody(response,50000)));
 return JSON.parse(parsed.choices[0].message.content) as unknown;
}

import {after} from 'next/server';
import {processIntegrationJobs} from '@/server/connected-apps/worker';
import {getServerEnv} from '@/server/env';
import {getDb} from '@/server/db/client';
import {jobs} from '@/server/db/schema';
import {seal} from '@/server/integration-crypto';
import {appEnabled} from '@/server/connected-apps/config';
import {boundedBody,validDiscordSignature} from '@/server/connected-apps/security';
import {discordInteraction,discordActor,discordReplyModal} from '@/server/connected-apps/discord';
const ephemeral=(content:string)=>Response.json({type:4,data:{content,flags:64,allowed_mentions:{parse:[]}}});
export const maxDuration=60;
export async function POST(request:Request){
 if(!appEnabled('discord'))return new Response('Unavailable',{status:404});
 const env=getServerEnv();let body:string;try{body=await boundedBody(request,32768);}catch{return new Response('Invalid payload',{status:400});}
 if(!env.DISCORD_PUBLIC_KEY||!validDiscordSignature(body,request.headers.get('x-signature-timestamp')??'',request.headers.get('x-signature-ed25519')??'',env.DISCORD_PUBLIC_KEY))return new Response('Unauthorized',{status:401});
 try{const data=JSON.parse(body);if(data.type===1)return Response.json({type:1});const p=discordInteraction.parse(data);if(p.data.custom_id.endsWith(':status')){if(p.type!==3||!p.data.values?.[0])return ephemeral('Choose a status.');p.data.custom_id=p.data.custom_id.replace(/:status$/,':'+p.data.values[0]);}if(p.application_id!==env.DISCORD_CLIENT_ID)return new Response('Unauthorized',{status:401});
 if(p.type!==3&&p.type!==5)return ephemeral('This action is not supported.');
 if(p.type===3&&p.data.custom_id.endsWith(':reply')){const actor=await discordActor(p);return Response.json(discordReplyModal(actor.delivery.id));}
 if(p.type===5&&!p.data.custom_id.endsWith(':submit')||p.type===3&&p.data.custom_id.endsWith(':submit'))return ephemeral('This action is not supported.');
 // Validate membership again in the worker; acknowledge before external work.
 if(!env.INTEGRATION_ENCRYPTION_KEY)throw Error();const key='discord:action:'+p.id;
 await getDb().insert(jobs).values({type:'integration_delivery',dedupeKey:key,maxAttempts:5,payload:{kind:'discord_action',sealed:seal(p,env.INTEGRATION_ENCRYPTION_KEY,'discord-interaction:'+key),expires:Date.now()+14*60000}}).onConflictDoNothing();
 after(()=>processIntegrationJobs(2).then(()=>undefined));
 return Response.json({type:5,data:{flags:64}});
 }catch{return ephemeral('The action could not be completed. Link your Discord account in Ent and check your workspace permissions.');}
}

import 'server-only';
import {createHash} from 'node:crypto';
import {ServiceError} from '@/server/result';
import {consumeRateLimit} from '@/server/rate-limit';
export function requestToken(request:Request){return request.headers.get('authorization')?.replace(/^Bearer /,'')??'';}
export async function limitChatRequest(request:Request){
 // Only hosting-injected addresses; never trust arbitrary public x-forwarded-for.
 const ip=process.env.NETLIFY==='true'?(request.headers.get('x-nf-client-connection-ip')??'unknown'):'unknown';
 await consumeRateLimit('chat:ip:'+createHash('sha256').update(ip).digest('hex'),240,60);
 await consumeRateLimit('chat:http:global',3000,60);
}
export async function readChatBody(request:Request){
 if(Number(request.headers.get('content-length'))>12000)throw new ServiceError('validation','This message is too long.');
 const reader=request.body?.getReader();if(!reader)throw new ServiceError('validation','A message is required.');let bytes=0,text='';const decoder=new TextDecoder();
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12000){await reader.cancel();throw new ServiceError('validation','This message is too long.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('validation','Invalid message.');}finally{reader.releaseLock();}
}

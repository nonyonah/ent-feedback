import {createHmac,timingSafeEqual,createPublicKey,verify,createHash} from 'node:crypto';
export function validLinearSignature(body:string,signature:string,secret:string,timestamp:number,now=Date.now()){
 if(!/^[a-f0-9]{64}$/i.test(signature)||!Number.isFinite(timestamp)||Math.abs(now-timestamp)>60000)return false;
 return timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature,'hex'));
}
export function validDiscordSignature(body:string,timestamp:string,signature:string,publicKey:string,now=Date.now()){
 if(!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!(/^[a-f0-9]{128}$/i.test(signature))||!(/^[a-f0-9]{64}$/i.test(publicKey)))return false;
 try{return verify(null,Buffer.from(timestamp+body),createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(publicKey,'hex')]),format:'der',type:'spki'}),Buffer.from(signature,'hex'));}catch{return false;}
}
export function externalRequestId(value:string){const hex=createHash('sha256').update(value).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;}
export function discordNonce(value:string){return createHash('sha256').update(value).digest('hex').slice(0,24);}
/** Bound unauthenticated payloads before JSON parsing or signature processing. */
export async function boundedBody(request:Request|Response,max=262144){const reader=request.body?.getReader();if(!reader)return '';let bytes=0;const chunks:Uint8Array[]=[];try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>max){await reader.cancel();throw Error('Payload too large');}chunks.push(part.value);}}finally{reader.releaseLock();}return Buffer.concat(chunks).toString('utf8');}

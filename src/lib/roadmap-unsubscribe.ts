import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
const claim=z.object({workspaceId:z.uuid(),email:z.email().max(254)});
function key(secret:string){if(secret.length<32)throw Error('Email unsubscribe secret is not configured');return createHash('sha256').update('ent-roadmap-v1:'+secret).digest();}
export function roadmapUnsubscribeToken(input:z.infer<typeof claim>,secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);cipher.setAAD(Buffer.from('ent-roadmap-v1'));const data=Buffer.concat([cipher.update(JSON.stringify(claim.parse(input))),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function readRoadmapUnsubscribe(token:string,secret:string){try{if(!/^[A-Za-z0-9_-]{40,1000}$/.test(token))return null;const bytes=Buffer.from(token,'base64url'),cipher=createDecipheriv('aes-256-gcm',key(secret),bytes.subarray(0,12));cipher.setAAD(Buffer.from('ent-roadmap-v1'));cipher.setAuthTag(bytes.subarray(12,28));return claim.parse(JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString()));}catch{return null;}}

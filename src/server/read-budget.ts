import 'server-only';
import {headers} from 'next/headers';
import {createHash} from 'node:crypto';
import {consumeRateLimit} from '@/server/rate-limit';
export async function limitFeedbackReadRequest(){
 const h=await headers();
 const ip=process.env.NETLIFY==='true'?(h.get('x-nf-client-connection-ip')??'unknown'):'unknown';
 await consumeRateLimit('feedback:read-ip:'+createHash('sha256').update(ip).digest('hex'),240,60);
 await consumeRateLimit('feedback:read-global',5000,60);
}

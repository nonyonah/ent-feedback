import 'server-only';
import {createHash} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {rateLimits} from '@/server/db/schema';
import {ServiceError} from '@/server/result';
export async function consumeRateLimit(scope:string,limit:number,seconds:number){
 const window=Math.floor(Date.now()/(seconds*1000));
 const key=createHash('sha256').update(scope+':'+window).digest('hex');
 const [row]=await getDb().insert(rateLimits).values({key,count:1,expiresAt:new Date((window+1)*seconds*1000)}).onConflictDoUpdate({target:rateLimits.key,set:{count:sql`${rateLimits.count}+1`}}).returning({count:rateLimits.count});
 if(row.count>limit)throw new ServiceError('rate_limited','Too many requests. Please wait before trying again.');
}

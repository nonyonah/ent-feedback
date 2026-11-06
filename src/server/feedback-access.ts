import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {and,eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {boards,guestActors} from '@/server/db/schema';
import {getOptionalAppUser} from '@/server/auth';
import {consumeRateLimit} from '@/server/rate-limit';
import {ServiceError} from '@/server/result';
export async function requireBoard(workspaceId:string,boardId:string){
 const db=getDb();const [board]=await db.select({id:boards.id}).from(boards).where(and(eq(boards.workspaceId,workspaceId),eq(boards.id,boardId))).limit(1);
 if(!board)throw new ServiceError('not_found','This board isn’t available. Check the board link.');
}
export async function feedbackActor(workspaceId:string,token?:string,create=false){
 const user=await getOptionalAppUser();if(user)return {user,guestId:null,token:undefined};
 const db=getDb();
 if(token&&/^[a-f0-9]{64}$/.test(token)){
  const [guest]=await db.select({id:guestActors.id}).from(guestActors).where(and(eq(guestActors.workspaceId,workspaceId),eq(guestActors.tokenHash,createHash('sha256').update(token).digest('hex')))).limit(1);
  if(guest)return {user:null,guestId:guest.id,token};
 }
 if(!create)throw new ServiceError('unauthenticated','Refresh the board to reconnect before trying again.');
 await consumeRateLimit('visitor-bootstrap:'+workspaceId,500,3600);
 const next=randomBytes(32).toString('hex');
 const [guest]=await db.insert(guestActors).values({workspaceId,tokenHash:createHash('sha256').update(next).digest('hex')}).returning({id:guestActors.id});
 return {user:null,guestId:guest.id,token:next};
}

export type FeedbackActor=Awaited<ReturnType<typeof feedbackActor>>;

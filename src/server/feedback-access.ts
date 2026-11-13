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
const tokenPattern=/^[a-f0-9]{64}$/;
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function feedbackActor(workspaceId:string,token?:string,create=false){
 const user=await getOptionalAppUser();if(user)return {user,guestId:null,token:undefined};
 const db=getDb();
 const offered=token&&tokenPattern.test(token)?token:undefined;
 if(offered){
  const [guest]=await db.select({id:guestActors.id}).from(guestActors).where(and(eq(guestActors.workspaceId,workspaceId),eq(guestActors.tokenHash,tokenHash(offered)))).limit(1);
  if(guest)return {user:null,guestId:guest.id,token:offered};
 }
 if(!create)throw new ServiceError('unauthenticated','Refresh the board to reconnect before trying again.');
 await consumeRateLimit('visitor-bootstrap:'+workspaceId,500,3600);
 // The browser keeps one token per workspace, so parallel first loads all offer
 // the same token. Claim that identity instead of minting a new one per request.
 if(offered){
  const inserted=await db.insert(guestActors).values({workspaceId,tokenHash:tokenHash(offered)}).onConflictDoNothing().returning({id:guestActors.id});
  if(inserted.length)return {user:null,guestId:inserted[0].id,token:offered};
  // Another request may have claimed it, or the token belongs to another workspace.
  const [claimed]=await db.select({id:guestActors.id}).from(guestActors).where(and(eq(guestActors.workspaceId,workspaceId),eq(guestActors.tokenHash,tokenHash(offered)))).limit(1);
  if(claimed)return {user:null,guestId:claimed.id,token:offered};
 }
 const next=randomBytes(32).toString('hex');
 const [guest]=await db.insert(guestActors).values({workspaceId,tokenHash:tokenHash(next)}).returning({id:guestActors.id});
 return {user:null,guestId:guest.id,token:next};
}

export type FeedbackActor=Awaited<ReturnType<typeof feedbackActor>>;

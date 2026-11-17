import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {and,eq,ne,or,gt,isNull,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {guestEmailVerifications,feedback,conversations} from '@/server/db/schema';
import {consumeRateLimit} from '@/server/rate-limit';
import {getServerEnv} from '@/server/env';
import {sendGuestVerificationEmail} from '@/server/email';
import {ServiceError} from '@/server/result';

export const guestEmailHash=(value:string)=>createHash('sha256').update(value).digest('hex');
type Target={workspaceId:string;kind:'feedback'|'chat';subjectId:string;email:string};
export async function guestEmailVerified(target:Target,db:Queryable=getDb()){
 const [row]=await db.select({id:guestEmailVerifications.id}).from(guestEmailVerifications).where(and(
  eq(guestEmailVerifications.workspaceId,target.workspaceId),eq(guestEmailVerifications.kind,target.kind),
  eq(guestEmailVerifications.subjectId,target.subjectId),eq(guestEmailVerifications.email,target.email.toLowerCase()),
  sql`${guestEmailVerifications.verifiedAt} is not null`,
 )).limit(1);return Boolean(row);
}
// Call only after authenticating the resource's anonymous owner. A confirmation
// email contains no transcript or visitor-supplied text.
export async function requestGuestVerification(target:Target,requester:string){
 const email=z.email().max(254).parse(target.email.toLowerCase());
 if(await guestEmailVerified({...target,email}))return {sent:false,verified:true};
 const db=getDb();
 // Persist the creator binding even if a send budget/provider blocks delivery,
 // so the same visitor can retry later without claiming someone else's post.
 await db.insert(guestEmailVerifications).values({...target,email,requesterHash:guestEmailHash(requester),tokenHash:guestEmailHash(randomBytes(32).toString('hex')),expiresAt:new Date()}).onConflictDoNothing();
 await consumeRateLimit('guest-email:global',300,3600);
 await consumeRateLimit('guest-email:mailbox:'+guestEmailHash(email),3,3600);
 await consumeRateLimit('guest-email:requester:'+guestEmailHash(requester),5,3600);
 await consumeRateLimit('guest-email:workspace:'+target.workspaceId,50,3600);
 await consumeRateLimit('guest-email:subject:'+target.subjectId,1,60);
 const token=randomBytes(32).toString('hex');
 const [row]=await db.insert(guestEmailVerifications).values({...target,email,requesterHash:guestEmailHash(requester),tokenHash:guestEmailHash(token),expiresAt:new Date(Date.now()+30*60_000)}).onConflictDoUpdate({target:[guestEmailVerifications.workspaceId,guestEmailVerifications.kind,guestEmailVerifications.subjectId],set:{email,requesterHash:guestEmailHash(requester),tokenHash:guestEmailHash(token),expiresAt:new Date(Date.now()+30*60_000),verifiedAt:null,updatedAt:new Date()},setWhere:or(isNull(guestEmailVerifications.verifiedAt),ne(guestEmailVerifications.email,email))}).returning({id:guestEmailVerifications.id});
 if(!row)return {sent:false,verified:true};
 const url=new URL('/api/email/verify',getServerEnv().NEXT_PUBLIC_APP_URL);url.searchParams.set('id',row.id);url.searchParams.set('token',token);
 await sendGuestVerificationEmail({to:email,url:url.href,key:'guest-verification:'+row.id+':'+guestEmailHash(token)});
 return {sent:true,verified:false};
}
export async function confirmGuestEmail(id:string,token:string){
 z.uuid().parse(id);if(!/^[a-f0-9]{64}$/.test(token))throw new ServiceError('validation','This verification link is invalid or expired.');
 return getDb().transaction(async tx=>{
  const valid=and(eq(guestEmailVerifications.id,id),eq(guestEmailVerifications.tokenHash,guestEmailHash(token)),isNull(guestEmailVerifications.verifiedAt),gt(guestEmailVerifications.expiresAt,new Date()));
  const [row]=await tx.select().from(guestEmailVerifications).where(valid).limit(1);
  if(!row)throw new ServiceError('validation','This verification link is invalid, expired or already used.');
  const [subject]=row.kind==='chat'?await tx.select({email:conversations.email}).from(conversations).where(and(eq(conversations.id,row.subjectId),eq(conversations.workspaceId,row.workspaceId))).for('update'):await tx.select({email:feedback.guestEmail}).from(feedback).where(and(eq(feedback.id,row.subjectId),eq(feedback.workspaceId,row.workspaceId),isNull(feedback.deletedAt),isNull(feedback.authorUserId))).for('update');
  if(!subject||subject.email!==row.email)throw new ServiceError('validation','This email address has changed. Request a new link.');
  // Match contact-update lock order (resource, then verification record) and
  // atomically consume the still-current challenge after locking the resource.
  const [confirmed]=await tx.update(guestEmailVerifications).set({verifiedAt:new Date(),updatedAt:new Date()}).where(valid).returning({id:guestEmailVerifications.id});
  if(!confirmed)throw new ServiceError('validation','This verification link is invalid, expired or already used.');
  return {verified:true};
 });
}

import 'server-only';
import {createHash, randomBytes} from 'node:crypto';
import {and, eq, gt, isNull, sql, desc} from 'drizzle-orm';
import {z} from 'zod';
import {getDb, type Transaction} from '@/server/db/client';
import {boards,previewClaims,workspaceMembers,workspaces} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import {requireAppUser} from '@/server/auth';
import {currentUser} from '@clerk/nextjs/server';
import {boardTemplateIds} from '@/lib/board-templates';
import {seedBoardSamples} from '@/server/services/sample-items';

export const unavailable = 'This claim link has expired or has already been used.';
export const claimCookie = 'ent-preview-claim';
export const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const digest = (token:string)=>createHash('sha256').update(token).digest('hex');
const suffix = ()=>randomBytes(8).toString('hex');
export function previewsEnabled(){
  return getServerEnv().PREVIEWS_ENABLED === 'true';
}
export function founderAllowed(email:string|null,list:string|undefined){
  return Boolean(email && list?.split(',').some(value=>value.trim().toLowerCase()===email.toLowerCase()));
}
export async function requireFounder(){
  if(!previewsEnabled())throw new ServiceError('forbidden','Not found.');
  const user=await requireAppUser();
  const clerk=await currentUser();
  const primary=clerk?.primaryEmailAddress;
  if(clerk?.id!==user.clerkUserId||primary?.verification?.status!=='verified'||!founderAllowed(primary.emailAddress,getServerEnv().FOUNDER_EMAILS))throw new ServiceError('forbidden','Not found.');
  return user;
}
function demoId(){
  const id=getServerEnv().DEMO_APP_USER_ID;
  if(!id)throw new ServiceError('validation','Set the demo app user ID before managing previews.');
  return id;
}
export async function createPreview(input:{product:string;prospect:string;template:string}){
  if(!previewsEnabled())throw new ServiceError('forbidden','Previews are disabled.');
  const product=z.string().trim().min(1).max(80).parse(input.product);
  const prospect=z.string().trim().max(80).parse(input.prospect);
  const token=randomBytes(32).toString('base64url');
  const demo=demoId();
  const boardId=await getDb().transaction(async tx=>{
    const handle='preview-'+suffix();
    const [workspace]=await tx.insert(workspaces).values({handle,name:product+' · '+handle.slice(-8)}).returning();
    await tx.insert(workspaceMembers).values({userId:demo,workspaceId:workspace.id,role:'owner'});
    const [board]=await tx.insert(boards).values({workspaceId:workspace.id,name:product,handle:'product'}).returning();
    await seedBoardSamples(tx,workspace.id,board.id,product,z.enum(boardTemplateIds).parse(input.template));
    await tx.insert(previewClaims).values({workspaceId:workspace.id,boardId:board.id,prospectName:prospect||null,tokenHash:digest(token),expiresAt:sql`now()+interval '14 days'`});
    return board.id;
  });
  return {token,boardId};
}
export function listPreviews(){
  return getDb().select({id:previewClaims.workspaceId,name:boards.name,prospect:previewClaims.prospectName,status:sql<string>`case when ${previewClaims.claimedAt} is not null then 'Claimed' when ${previewClaims.expiresAt}<=now() then 'Expired' else 'Unclaimed' end`}).from(previewClaims).innerJoin(boards,eq(boards.id,previewClaims.boardId)).orderBy(desc(previewClaims.expiresAt));
}
export async function lookupPreview(token:string){
  if(!previewsEnabled()||!tokenPattern.test(token))return null;
  const [row]=await getDb().select({product:boards.name,boardId:boards.id,handle:workspaces.handle,board:boards.handle}).from(previewClaims).innerJoin(workspaces,eq(workspaces.id,previewClaims.workspaceId)).innerJoin(boards,eq(boards.id,previewClaims.boardId)).where(and(eq(previewClaims.tokenHash,digest(token)),isNull(previewClaims.claimedAt),gt(previewClaims.expiresAt,sql`now()`)));
  return row??null;
}
async function isolatedOwner(tx:Transaction,id:string,boardId:string){
  await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,id)).for('update');
  const members=await tx.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId,id)).for('update');
  const children=await tx.select({id:boards.id}).from(boards).where(eq(boards.workspaceId,id)).for('update');
  if(members.length!==1||members[0].role!=='owner'||members[0].status!=='active'||members[0].userId!==demoId()||children.length!==1||children[0].id!==boardId)throw new ServiceError('conflict','This preview is no longer isolated. Contact the founder.');
  return members[0].id;
}
export async function claimPreview(token:string,userId:string){
  if(!previewsEnabled()||!tokenPattern.test(token)||userId===demoId())throw new ServiceError('conflict',unavailable);
  return getDb().transaction(async tx=>{
    const [row]=await tx.update(previewClaims).set({claimedAt:sql`now()`}).where(and(eq(previewClaims.tokenHash,digest(token)),isNull(previewClaims.claimedAt),gt(previewClaims.expiresAt,sql`now()`))).returning();
    if(!row)throw new ServiceError('conflict',unavailable);
    const member=await isolatedOwner(tx,row.workspaceId,row.boardId);
    await tx.update(workspaceMembers).set({userId,updatedAt:new Date()}).where(eq(workspaceMembers.id,member));
    await tx.update(workspaces).set({handle:'board-'+suffix(),updatedAt:new Date()}).where(eq(workspaces.id,row.workspaceId));
    return {workspaceId:row.workspaceId,boardId:row.boardId};
  });
}
export async function managePreview(id:string,action:'extend'|'delete'){
  if(!previewsEnabled())throw new ServiceError('forbidden','Previews are disabled.');
  return getDb().transaction(async tx=>{
    const pending=and(eq(previewClaims.workspaceId,z.uuid().parse(id)),isNull(previewClaims.claimedAt));
    if(action==='extend'){
      const rows=await tx.update(previewClaims).set({expiresAt:sql`greatest(now(), ${previewClaims.expiresAt})+interval '7 days'`}).where(pending).returning({id:previewClaims.workspaceId});
      if(!rows.length)throw new ServiceError('conflict',unavailable);
      return;
    }
    const [row]=await tx.select().from(previewClaims).where(pending).for('update');
    if(!row)throw new ServiceError('conflict',unavailable);
    await isolatedOwner(tx,id,row.boardId);
    await tx.delete(workspaces).where(eq(workspaces.id,id));
  });
}

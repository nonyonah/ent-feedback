"use server";

import {and,eq,inArray,isNull,notInArray,desc,sql} from "drizzle-orm";
import {z} from "zod";
import {requireAppUser} from "@/server/auth";
import {getDb} from "@/server/db/client";
import {changelogEntries,changelogFeedback,changelogUploads,feedback} from "@/server/db/schema";
import {requireWorkspaceRole} from "@/server/services/access";
import {runService,ServiceError} from "@/server/result";
import {trackServerAnalytics} from "@/lib/analytics/server";
import {changelogInputSchema,changelogSlugPattern,slugifyChangelogTitle} from "@/lib/changelog";
import {changelogSlugTaken,listChangelogEntries,readChangelogEntry} from "@/server/changelog/service";
import {aiProviderConfigured,readWorkspaceAiSettings} from '@/server/ai/settings';
import {generateFeedbackChangelog} from '@/server/ai/changelog-draft';
import {consumeRateLimit} from '@/server/rate-limit';

const uuid=z.string().uuid();

/** Returns an unsaved draft for review; it never publishes or notifies voters. */
export async function suggestChangelogFromFeedbackAction(workspaceId:string,feedbackIds:unknown){
 return runService(async()=>{
  const actor=await requireAppUser(),wid=uuid.parse(workspaceId),ids=z.array(uuid).min(1).max(10).transform(values=>[...new Set(values)]).parse(feedbackIds),db=getDb();
  await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:'admin'});
  if(!aiProviderConfigured()||!(await readWorkspaceAiSettings(wid)).feedbackEnabled)throw new ServiceError('conflict','Enable AI for feedback in workspace integrations first.');
  await consumeRateLimit('ai:changelog:'+wid+':'+actor.id,20,3600);
  const rows=await db.select({id:feedback.id,title:feedback.title,body:feedback.body}).from(feedback).where(and(eq(feedback.workspaceId,wid),inArray(feedback.id,ids),eq(feedback.status,'shipped'),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId)));
  if(rows.length!==ids.length)throw new ServiceError('validation','Choose shipped requests from this workspace.');
  try{return await generateFeedbackChangelog(rows);}catch{throw new ServiceError('conflict','The AI draft could not be generated. Try again.');}
 });
}

export async function searchChangelogRequestsAction(workspaceId:string,input:unknown){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId);
    const {query,offset}=z.object({query:z.string().trim().max(160),offset:z.number().int().min(0).max(100000).default(0)}).parse(input);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const rows=await db.select({id:feedback.id,title:feedback.title,status:feedback.status}).from(feedback)
      .where(and(eq(feedback.workspaceId,wid),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),query?sql`position(${query.toLowerCase()} in lower(${feedback.title})) > 0`:undefined))
      .orderBy(desc(feedback.createdAt),desc(feedback.id)).limit(51).offset(offset);
    return {items:rows.slice(0,50),nextOffset:rows.length>50?offset+50:null};
  });
}

async function uniqueSlug(workspaceId:string,requested:string,exceptId?:string):Promise<string>{
  const base=slugifyChangelogTitle(requested);
  for(let attempt=0;attempt<40;attempt++){
    const candidate=attempt===0?base:`${base}-${attempt+1}`;
    if(!(await changelogSlugTaken(workspaceId,candidate,exceptId)))return candidate;
  }
  throw new ServiceError("conflict","That URL is taken. Pick a different slug.");
}

async function syncLinks(workspaceId:string,entryId:string,feedbackIds:string[]){
  const db=getDb();
  const ids=[...new Set(feedbackIds)];
  if(ids.length){
    // Only requests that live in this workspace can be announced.
    const owned=await db.select({id:feedback.id}).from(feedback)
      .where(and(eq(feedback.workspaceId,workspaceId),inArray(feedback.id,ids),isNull(feedback.deletedAt)));
    if(owned.length!==ids.length)throw new ServiceError("validation","Some linked requests no longer exist. Refresh and try again.");
    await db.insert(changelogFeedback).values(ids.map(feedbackId=>({workspaceId,changelogId:entryId,feedbackId})))
      .onConflictDoNothing({target:[changelogFeedback.changelogId,changelogFeedback.feedbackId]});
  }
  await db.delete(changelogFeedback).where(and(
    eq(changelogFeedback.workspaceId,workspaceId),
    eq(changelogFeedback.changelogId,entryId),
    ids.length?notInArray(changelogFeedback.feedbackId,ids):undefined,
  ));
}

export async function listChangelogEntriesAction(workspaceId:string){
  return runService(()=>listChangelogEntries(workspaceId));
}

export async function saveChangelogEntryAction(workspaceId:string,entryId:string|null,input:unknown){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId);
    const eid=entryId?uuid.parse(entryId):null;
    const value=changelogInputSchema.parse(input);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    if(value.coverImage){
      const [cover]=await db.select({id:changelogUploads.id}).from(changelogUploads).where(and(eq(changelogUploads.id,value.coverImage.split('/').pop()!),eq(changelogUploads.workspaceId,wid))).limit(1);
      if(!cover)throw new ServiceError("validation","Upload a cover image for this workspace.");
    }
    const requested=value.slug?.trim();
    if(requested&&!changelogSlugPattern.test(requested))throw new ServiceError("validation","Use lowercase letters, numbers and dashes in the URL.");
    const slug=await uniqueSlug(wid,requested||value.title,eid??undefined);

    const result=await db.transaction(async tx=>{
      if(eid){
        const [row]=await tx.update(changelogEntries).set({title:value.title,slug,summary:value.summary||null,coverImage:value.coverImage??null,body:value.body,category:value.category,updatedAt:new Date()})
          .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).returning({id:changelogEntries.id});
        if(!row)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
        return row.id;
      }
      const [row]=await tx.insert(changelogEntries)
        .values({workspaceId:wid,title:value.title,slug,summary:value.summary||null,coverImage:value.coverImage??null,body:value.body,category:value.category,authorUserId:actor.id,status:"draft"})
        .returning({id:changelogEntries.id});
      if(!row)throw new ServiceError("internal","The entry wasn’t saved. Try again.");
      return row.id;
    });
    await syncLinks(wid,result,value.feedbackIds);
    return readChangelogEntry(wid,result);
  });
}

const statusChangeSchema=z.object({status:z.enum(["draft","published","scheduled"]),at:z.string().datetime().nullable().optional()});

export async function setChangelogEntryStatusAction(workspaceId:string,entryId:string,input:unknown){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId),eid=uuid.parse(entryId);
    const value=statusChangeSchema.parse(input);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const now=new Date();
    const scheduledFor=value.status==="scheduled"?(value.at?new Date(value.at):null):null;
    if(value.status==="scheduled"&&(!scheduledFor||scheduledFor.getTime()<=now.getTime()))throw new ServiceError("validation","Pick a future date and time to schedule this entry.");

    const {firstPublish}=await db.transaction(async tx=>{
      const [current]=await tx.select({id:changelogEntries.id,status:changelogEntries.status,publishedAt:changelogEntries.publishedAt}).from(changelogEntries)
        .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).for("update");
      if(!current)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
      const firstPublish=value.status==="published"&&current.status!=="published";
      await tx.update(changelogEntries).set({
        status:value.status,
        // Re-publishing keeps the original date so a changelog never jumps to the top of the timeline.
        publishedAt:value.status==="published"?(current.publishedAt??now):value.status==="scheduled"?null:null,
        scheduledFor,
        updatedAt:now,
      }).where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid)));
      return {firstPublish};
    });
    if(firstPublish)trackServerAnalytics("changelog_published",{},{user:actor});
    return readChangelogEntry(wid,eid);
  });
}

export async function deleteChangelogEntryAction(workspaceId:string,entryId:string){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId),eid=uuid.parse(entryId);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const [deleted]=await db.delete(changelogEntries)
      .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).returning({id:changelogEntries.id});
    if(!deleted)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
    return {deletedId:deleted.id};
  });
}

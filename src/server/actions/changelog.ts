"use server";

import {and,eq} from "drizzle-orm";
import {z} from "zod";
import {requireAppUser} from "@/server/auth";
import {getDb} from "@/server/db/client";
import {changelogEntries} from "@/server/db/schema";
import {requireWorkspaceRole} from "@/server/services/access";
import {runService,ServiceError} from "@/server/result";
import {trackServerAnalytics} from "@/lib/analytics/server";
import {changelogInputSchema,toChangelogEntry} from "@/lib/changelog";
import {changelogSelection,listChangelogEntries} from "@/server/changelog/service";

const uuid=z.string().uuid();

export async function listChangelogEntriesAction(workspaceId:string){
  return runService(()=>listChangelogEntries(workspaceId));
}

export async function createChangelogEntryAction(workspaceId:string,input:unknown){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId);
    const value=changelogInputSchema.parse(input);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const [row]=await db.insert(changelogEntries).values({workspaceId:wid,title:value.title,body:value.body}).returning(changelogSelection);
    if(!row)throw new ServiceError("internal","The entry wasn’t saved. Try again.");
    return toChangelogEntry(row);
  });
}

export async function updateChangelogEntryAction(workspaceId:string,entryId:string,input:unknown){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId),eid=uuid.parse(entryId);
    const value=changelogInputSchema.parse(input);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const [row]=await db.update(changelogEntries).set({title:value.title,body:value.body,updatedAt:new Date()})
      .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).returning(changelogSelection);
    if(!row)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
    return toChangelogEntry(row);
  });
}

export async function setChangelogEntryPublishedAction(workspaceId:string,entryId:string,published:boolean){
  return runService(async()=>{
    const actor=await requireAppUser();
    const wid=uuid.parse(workspaceId),eid=uuid.parse(entryId);
    const live=z.boolean().parse(published);
    const db=getDb();
    await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
    const {entry,firstPublish}=await db.transaction(async tx=>{
      const [current]=await tx.select({id:changelogEntries.id,publishedAt:changelogEntries.publishedAt}).from(changelogEntries)
        .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).for("update");
      if(!current)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
      const firstPublish=live&&!current.publishedAt;
      const [row]=await tx.update(changelogEntries).set({publishedAt:live?(current.publishedAt??new Date()):null,updatedAt:new Date()})
        .where(and(eq(changelogEntries.workspaceId,wid),eq(changelogEntries.id,eid))).returning(changelogSelection);
      if(!row)throw new ServiceError("not_found","Entry not found in this workspace. Refresh and try again.");
      return {entry:toChangelogEntry(row),firstPublish};
    });
    // Re-publishing keeps the original date, so only the first public moment counts.
    if(firstPublish)trackServerAnalytics("changelog_published",{},{user:actor});
    return entry;
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

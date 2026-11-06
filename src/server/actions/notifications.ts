'use server';
import {and,eq,isNull,lt,or,desc,sql} from 'drizzle-orm';
import {z} from 'zod';
import {requireAppUser,getOptionalAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {notifications,feedback} from '@/server/db/schema';
import {runService} from '@/server/result';
import {activityLabel} from '@/server/activity';
export async function loadNotificationsAction(workspaceId:string,cursor?:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),actor=await getOptionalAppUser();if(!actor)return {items:[],nextCursor:null,unread:0,signInRequired:true};
 let boundary;
 if(cursor){const parsed=z.object({at:z.iso.datetime(),id:z.uuid()}).parse(JSON.parse(cursor));const date=new Date(parsed.at);boundary=or(lt(notifications.createdAt,date),and(eq(notifications.createdAt,date),lt(notifications.id,parsed.id)));}
 const scope=and(eq(notifications.recipientUserId,actor.id),eq(notifications.workspaceId,wid));
 const rows=await getDb().select({id:notifications.id,type:notifications.eventType,postId:feedback.id,title:feedback.title,at:notifications.createdAt,readAt:notifications.readAt}).from(notifications).innerJoin(feedback,and(eq(feedback.id,notifications.feedbackId),isNull(feedback.deletedAt))).where(and(scope,boundary)).orderBy(desc(notifications.createdAt),desc(notifications.id)).limit(26);
 const [counts]=await getDb().select({count:sql<number>`count(*)::int`}).from(notifications).innerJoin(feedback,and(eq(feedback.id,notifications.feedbackId),isNull(feedback.deletedAt))).where(and(scope,isNull(notifications.readAt)));
 const page=rows.slice(0,25),last=page.at(-1);
 return {items:page.map(row=>({...row,label:activityLabel(row.type),at:row.at.toISOString(),read:Boolean(row.readAt)})),nextCursor:rows.length>25&&last?JSON.stringify({at:last.at.toISOString(),id:last.id}):null,unread:counts.count,signInRequired:false};
});}
export async function markNotificationsReadAction(workspaceId:string,id?:string){return runService(async()=>{
 const actor=await requireAppUser(),wid=z.uuid().parse(workspaceId);if(id)z.uuid().parse(id);
 await getDb().update(notifications).set({readAt:new Date()}).where(and(eq(notifications.recipientUserId,actor.id),eq(notifications.workspaceId,wid),id?eq(notifications.id,id):undefined,isNull(notifications.readAt)));return {saved:true};
});}

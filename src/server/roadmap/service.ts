import 'server-only';
import {randomUUID} from 'node:crypto';
import {and,eq,sql,isNull,desc,asc,inArray,gte,lt} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {feedback,votes,comments,workspaces,statusHistory,jobs,users} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {ServiceError} from '@/server/result';
import {publishActivity} from '@/server/activity';
import {roadmapStatuses,adminRoadmapStatuses,columnKey,fractionalOrder,type RoadmapData,type RoadmapVoter} from '@/lib/roadmap';

export async function roadmapWorkspace(key:string){
 const handle=z.string().trim().min(2).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(key);
 const [workspace]=await getDb().select({id:workspaces.id,handle:workspaces.handle}).from(workspaces).where(eq(workspaces.handle,handle)).limit(1);
 if(!workspace)throw new ServiceError('not_found','Workspace not found.');return workspace;
}
const fields={voters:sql<RoadmapVoter[]>`coalesce((select jsonb_agg(jsonb_build_object('name',recent.name,'avatar_url',recent.avatar_url)) from (select coalesce(nullif(trim(ru.name),''),'Voter') as name, ru.avatar_url from ${votes} rv left join ${users} ru on ru.id=rv.user_id where rv.feedback_id=${feedback}.id and rv.workspace_id=${feedback}.workspace_id order by rv.created_at desc,rv.id desc limit 3) recent),'[]'::jsonb)`,id:feedback.id,board_id:feedback.boardId,title:feedback.title,category:feedback.category,status:feedback.status,public_note:feedback.publicNote,shipped_at:sql<string|null>`${feedback.shippedAt}::text`,roadmap_order:feedback.roadmapOrder,vote_count:sql<number>`(select count(*)::int from ${votes} rv where rv.feedback_id=${feedback}.id and rv.workspace_id=${feedback}.workspace_id)`,comment_count:sql<number>`(select count(*)::int from ${comments} rc where rc.feedback_id=${feedback}.id and rc.workspace_id=${feedback}.workspace_id and rc.deleted_at is null)`};
export async function readRoadmap(workspaceId:string,{admin=false,allShipped=false,cursor=0}:{admin?:boolean;allShipped?:boolean;cursor?:number}={}){
 const wid=z.uuid().parse(workspaceId);if(admin){const user=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'owner'});await consumeRateLimit('roadmap:read:'+user.id,120,60);}
 const offset=z.number().int().min(0).max(100000).parse(cursor);const data:RoadmapData={planned:[],in_progress:[],shipped:[],next_cursor:null};const db=getDb();
 for(const status of admin?adminRoadmapStatuses:roadmapStatuses){
  const rows=await db.select({...fields,...(admin?{roadmap_visible:feedback.roadmapVisible,shipped_notified_at:sql<string|null>`${feedback.shippedNotifiedAt}::text`}:{})}).from(feedback).where(and(eq(feedback.workspaceId,wid),eq(feedback.status,status),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),admin?undefined:eq(feedback.roadmapVisible,true),!admin&&!allShipped&&status==='shipped'?gte(feedback.shippedAt,new Date(Date.now()-30*86400000)):undefined)).orderBy(...(status==='shipped'&&!admin?[desc(feedback.shippedAt),desc(feedback.id)]:[asc(feedback.roadmapOrder),asc(feedback.id)])).limit(101).offset(offset);
  data[columnKey(status)]=rows.slice(0,100);if(rows.length>100)data.next_cursor=offset+100;
 }

 if(!admin&&!allShipped){const [older]=await db.select({id:feedback.id}).from(feedback).where(and(eq(feedback.workspaceId,wid),eq(feedback.status,'shipped'),eq(feedback.roadmapVisible,true),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),lt(feedback.shippedAt,new Date(Date.now()-30*86400000)))).limit(1);data.has_older_shipped=Boolean(older);}
 return data;
}
export const roadmapPatch=z.object({projectId:z.uuid(),status:z.enum(adminRoadmapStatuses).optional(),roadmap_order:z.number().finite().optional(),roadmap_visible:z.boolean().optional(),public_note:z.string().trim().max(140).nullable().optional(),notify_voters:z.boolean().optional(),before_id:z.uuid().nullable().optional(),after_id:z.uuid().nullable().optional()}).strict().refine(value=>Object.keys(value).some(key=>key!=='projectId'),'Choose a roadmap change.');
export async function updateRoadmap(id:string,input:unknown){
 const bid=z.uuid().parse(id),value=roadmapPatch.parse(input),wid=value.projectId,user=await requireAppUser(),db=getDb();
 await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'owner'});
 await consumeRateLimit('roadmap:write:'+user.id,120,60);
 return db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${wid+':roadmap'},0))`);
  const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,bid),eq(feedback.workspaceId,wid),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');
  if(!post)throw new ServiceError('not_found','This item is no longer available.');
  const status=value.status??post.status;
  let order=value.roadmap_order;
  if('before_id' in value||'after_id' in value){
   const ids=[value.before_id,value.after_id].filter((id):id is string=>Boolean(id));if(ids.includes(bid)||new Set(ids).size!==ids.length)throw new ServiceError('validation','Invalid roadmap position.');
   const neighbors=ids.length?await tx.select({id:feedback.id,order:feedback.roadmapOrder}).from(feedback).where(and(eq(feedback.workspaceId,wid),eq(feedback.status,status),inArray(feedback.id,ids),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))):[];
   if(neighbors.length!==ids.length)throw new ServiceError('conflict','The roadmap changed. Refresh and try again.');
   const before=neighbors.find(row=>row.id===value.before_id)?.order,after=neighbors.find(row=>row.id===value.after_id)?.order;
   // Resolve against the current column while holding its advisory lock. A
   // background update may have inserted another card between these anchors.
   // Keep the user's preceding anchor, then use its current successor instead
   // of rejecting an otherwise valid drop from a slightly older snapshot.
   const [successor]=await tx.select({order:feedback.roadmapOrder}).from(feedback).where(and(eq(feedback.workspaceId,wid),eq(feedback.status,status),sql`${feedback.id} <> ${bid}`,isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),before!=null?sql`(${feedback.roadmapOrder}, ${feedback.id}) > (${before}::double precision, ${value.before_id}::uuid)`:undefined)).orderBy(asc(feedback.roadmapOrder),asc(feedback.id)).limit(1);
   order=fractionalOrder(before,successor?.order??after);

  }
  if(value.notify_voters&&(status!=='shipped'||!(value.roadmap_visible??post.roadmapVisible)))throw new ServiceError('validation','Only visible shipped items can notify voters.');
  await tx.update(feedback).set({...(value.status?{status:value.status}:{}),...(order!==undefined?{roadmapOrder:order}:{}),...(value.roadmap_visible!==undefined?{roadmapVisible:value.roadmap_visible}:{}),...(value.public_note!==undefined?{publicNote:value.public_note||null}:{}),updatedAt:new Date()}).where(eq(feedback.id,bid));
  if(order!==undefined)await tx.update(feedback).set({roadmapOrder:order}).where(eq(feedback.id,bid));
  if(post.status!==status){await tx.insert(statusHistory).values({workspaceId:wid,feedbackId:bid,actorUserId:user.id,previousStatus:post.status,newStatus:status});await publishActivity(tx,{type:'status_changed',workspaceId:wid,feedbackId:bid,actorId:user.id,eventId:randomUUID(),skipEmail:true});}
  if(value.notify_voters&&!post.shippedNotifiedAt){
   const now=new Date();await tx.update(feedback).set({shippedNotifiedAt:now}).where(eq(feedback.id,bid));
   await tx.insert(jobs).values({type:'roadmap_fanout',dedupeKey:'roadmap:fanout:'+bid,payload:{workspaceId:wid,feedbackId:bid,cutoff:now.toISOString(),cursor:null}}).onConflictDoNothing();
  }
  const [updated]=await tx.select({...fields,roadmap_visible:feedback.roadmapVisible,shipped_notified_at:sql<string|null>`${feedback.shippedNotifiedAt}::text`}).from(feedback).where(eq(feedback.id,bid));return updated;
 });
}

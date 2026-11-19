'use server';
import {and,eq,inArray,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {votes,feedback} from '@/server/db/schema';
import {feedbackActor} from '@/server/feedback-access';
import {runService} from '@/server/result';
import {limitFeedbackReadRequest} from '@/server/read-budget';
export async function roadmapVotesAction(workspaceId:string,ids:string[],guestToken?:string){return runService(async()=>{
 await limitFeedbackReadRequest();const wid=z.uuid().parse(workspaceId),selected=z.array(z.uuid()).max(1000).parse(ids);const who=await feedbackActor(wid,guestToken,true);
 if(!selected.length)return {items:[],guestToken:who.token};
 const items=await getDb().select({id:feedback.id,voted:sql<boolean>`exists(select 1 from ${votes} rv where rv.feedback_id=${feedback}.id and rv.workspace_id=${feedback}.workspace_id and ${who.user?sql`rv.user_id=${who.user.id}`:sql`rv.guest_actor_id=${who.guestId!}`})`}).from(feedback).where(and(eq(feedback.workspaceId,wid),inArray(feedback.id,selected)));
 return {items,guestToken:who.token};
});}

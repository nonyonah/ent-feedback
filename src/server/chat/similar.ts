import 'server-only';
import { displayedVotes } from "@/server/services/displayed-votes";
import {and,eq,isNull,sql,desc,gt} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {feedback,conversations} from '@/server/db/schema';
import {authenticateConversation,requireChat,conversationWhere} from './service';
import {requireWorkspaceRole} from '@/server/services/access';
import {ServiceError} from '@/server/result';
export async function similarRequests(workspaceId:string,id:string,query:string,actor:{token:string}|{userId:string}){
 z.uuid().parse(workspaceId);z.uuid().parse(id);const text=z.string().trim().min(3).max(200).parse(query);const db=getDb();await requireChat(workspaceId);
 if('token' in actor)await authenticateConversation(db,workspaceId,id,actor.token);else{await requireWorkspaceRole(db,{workspaceId,userId:actor.userId,minimumRole:'member'});const [row]=await db.select({id:conversations.id}).from(conversations).where(conversationWhere(workspaceId,id)).limit(1);if(!row)throw new ServiceError('not_found','Conversation not found.');}
 const terms=[...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[])].slice(0,12);if(!terms.length)return [];
 const score=sql<number>`(${sql.join(terms.map(term=>sql`case when position(${term} in lower(${feedback.title} || ' ' || ${feedback.body}))>0 then 1 else 0 end`),sql` + `)})`;
 return db.select({id:feedback.id,isSample:feedback.isSample,title:feedback.title,boardId:feedback.boardId,votes:displayedVotes}).from(feedback).where(and(eq(feedback.workspaceId,workspaceId),eq(feedback.category,'feature_request'),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),gt(score,0))).orderBy(desc(score),desc(feedback.createdAt)).limit(5);
}

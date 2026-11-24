import {notFound,redirect} from 'next/navigation';
import {and,eq,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getPublicWorkspace} from '@/server/public-workspace';
import {getDb} from '@/server/db/client';
import {feedback} from '@/server/db/schema';
import {ItemDetail} from '@/components/feedback/item-detail';
import {feedbackHref} from '@/lib/project-links';
export const instant=false;
export default async function Page({params}:{params:Promise<{project:string;id:string}>}){
 const {project,id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const workspace=await getPublicWorkspace(project);if(!workspace)notFound();
 const [post]=await getDb().select({boardId:feedback.boardId,mergedIntoId:feedback.mergedIntoId}).from(feedback).where(and(eq(feedback.workspaceId,workspace.project.id),eq(feedback.id,id),isNull(feedback.deletedAt))).limit(1);
 if(!post)notFound();if(post.mergedIntoId)redirect(feedbackHref(workspace.project,post.mergedIntoId));return <ItemDetail id={id} boardId={post.boardId}/>;
}

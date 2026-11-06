import {notFound,redirect} from 'next/navigation';
import {and,eq,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {feedback,workspaces} from '@/server/db/schema';
export const instant=false;
export default async function ItemPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const [post]=await getDb().select({handle:workspaces.handle}).from(feedback).innerJoin(workspaces,eq(workspaces.id,feedback.workspaceId)).where(and(eq(feedback.id,id),isNull(feedback.deletedAt))).limit(1);
 if(!post)notFound();redirect(`/p/${encodeURIComponent(post.handle)}/items/${id}`);
}

import {and,eq,isNull,or} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {attachments,feedback,comments} from '@/server/db/schema';
import {getImage} from '@/server/storage';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.uuid().safeParse(id).success)return new Response('Not found',{status:404});
 const [image]=await getDb().select({key:attachments.storageKey}).from(attachments)
 .leftJoin(comments,and(eq(comments.id,attachments.commentId),isNull(comments.deletedAt)))
 .innerJoin(feedback,and(or(eq(feedback.id,attachments.feedbackId),eq(feedback.id,comments.feedbackId)),eq(feedback.workspaceId,attachments.workspaceId),isNull(feedback.deletedAt)))
 .where(and(eq(attachments.id,id),eq(attachments.status,'attached'))).limit(1);
 if(!image)return new Response('Not found',{status:404});
 try{return new Response(Buffer.from(await getImage(image.key)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch{return new Response('Image unavailable',{status:503});}
}

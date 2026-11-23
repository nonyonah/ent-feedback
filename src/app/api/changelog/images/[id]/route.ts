import {and,eq,lte,or,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogUploads,changelogEntries} from '@/server/db/schema';
import {getOptionalAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {getImage} from '@/server/storage';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return new Response('Not found',{status:404});
  const db=getDb();
  const [image]=await db.select().from(changelogUploads).where(eq(changelogUploads.id,id)).limit(1);
  if(!image)return new Response('Not found',{status:404});
  const url='/api/changelog/images/'+id;
  const [published]=await db.select({id:changelogEntries.id}).from(changelogEntries).where(and(eq(changelogEntries.workspaceId,image.workspaceId),eq(changelogEntries.status,'published'),lte(changelogEntries.publishedAt,new Date()),or(eq(changelogEntries.coverImage,url),sql`position(${url} in ${changelogEntries.body}) > 0`))).limit(1);
  if(!published){
    try{const actor=await getOptionalAppUser();if(!actor)return new Response('Not found',{status:404});await requireWorkspaceRole(db,{workspaceId:image.workspaceId,userId:actor.id,minimumRole:'admin'});}
    catch{return new Response('Not found',{status:404});}
  }
  try{return new Response(Buffer.from(await getImage(image.storageKey)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}
  catch{return new Response('Image unavailable',{status:503});}
}

import {z} from 'zod';
import {and,eq,isNotNull} from 'drizzle-orm';
import {chatUploads} from '@/server/db/schema';
import {getDb} from '@/server/db/client';
import {getImage} from '@/server/storage';
import {verifyChatImage} from '@/server/chat/uploads';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const url=new URL(request.url);if(!z.uuid().safeParse(id).success||!verifyChatImage(id,url.searchParams.get('expires')??'',url.searchParams.get('signature')??''))return new Response('Not found',{status:404});const [row]=await getDb().select().from(chatUploads).where(and(eq(chatUploads.id,id),isNotNull(chatUploads.requestId))).limit(1);if(!row)return new Response('Not found',{status:404});try{return new Response(Buffer.from(await getImage(row.storageKey)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});}catch{return new Response('Image unavailable',{status:503});}}

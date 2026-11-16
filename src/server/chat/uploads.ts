import 'server-only';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {and,eq,inArray,asc,isNull,lt,or} from 'drizzle-orm';
import {chatUploads} from '@/server/db/schema';
import {getDb,type Queryable} from '@/server/db/client';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import {sanitizeImage} from '@/server/image-validation';
import {putImage,deleteImage} from '@/server/storage';
function signature(id:string,expires:string){const key=getServerEnv().CRON_SECRET;if(!key)throw new ServiceError('retryable','Image delivery is not configured.');return createHmac('sha256',key).update('chat-image:'+id+':'+expires).digest('hex');}
export function chatImageUrl(id:string){const expires=String(Math.floor(Date.now()/1000)+7*86400);return new URL(`/api/chat/images/${id}?expires=${expires}&signature=${signature(id,expires)}`,getServerEnv().NEXT_PUBLIC_APP_URL).href;}
export function verifyChatImage(id:string,expires:string,sig:string){if(!/^\d{10}$/.test(expires)||Number(expires)<Date.now()/1000||Number(expires)>Date.now()/1000+8*86400||!/^[a-f0-9]{64}$/.test(sig))return false;return timingSafeEqual(Buffer.from(signature(id,expires),'hex'),Buffer.from(sig,'hex'));}
export async function storeChatImage(workspaceId:string,conversationId:string,bytes:Buffer,userId?:string){const image=await sanitizeImage(bytes);signature('configuration-check',String(Math.floor(Date.now()/1000)));const id=randomUUID(),key=`chat/${workspaceId}/${id}.webp`;await putImage(key,image.bytes);try{await getDb().insert(chatUploads).values({id,workspaceId,conversationId,storageKey:key,uploaderUserId:userId??null});}catch(error){await deleteImage(key).catch(()=>{});throw error;}return id;}
export async function linkChatImages(tx:Queryable,workspaceId:string,conversationId:string,requestId:string,ids:string[],userId?:string,replay=false){
 const existing=await tx.select().from(chatUploads).where(and(eq(chatUploads.workspaceId,workspaceId),eq(chatUploads.conversationId,conversationId),eq(chatUploads.requestId,requestId),userId?eq(chatUploads.uploaderUserId,userId):isNull(chatUploads.uploaderUserId)));
 if(existing.some(row=>!ids.includes(row.id))||replay&&existing.length!==ids.length)throw new ServiceError('conflict','This message was already sent with different images.');
 if(!ids.length)return;
 const rows=await tx.select().from(chatUploads).where(and(eq(chatUploads.workspaceId,workspaceId),eq(chatUploads.conversationId,conversationId),inArray(chatUploads.id,ids))).orderBy(asc(chatUploads.id)).for('update');
 if(rows.length!==ids.length||new Set(ids).size!==ids.length||rows.some(row=>row.uploaderUserId!==(userId??null)||(row.requestId!==null&&row.requestId!==requestId)||(!row.requestId&&row.createdAt<new Date(Date.now()-86400000))))throw new ServiceError('forbidden','An image is unavailable. Remove it and attach it again.');
 await tx.update(chatUploads).set({requestId}).where(inArray(chatUploads.id,ids));
}
export async function cleanChatUploads(){
 const db=getDb();const tombstone='00000000-0000-0000-0000-000000000000';
 for(let i=0;i<3;i++){
  const row=await db.transaction(async tx=>{const [file]=await tx.select().from(chatUploads).where(or(eq(chatUploads.requestId,tombstone),and(isNull(chatUploads.requestId),lt(chatUploads.createdAt,new Date(Date.now()-86400000))))).orderBy(asc(chatUploads.createdAt)).limit(1).for('update',{skipLocked:true});if(!file)return null;await tx.update(chatUploads).set({requestId:tombstone}).where(eq(chatUploads.id,file.id));return file;});
  if(!row)break;try{await deleteImage(row.storageKey);await db.delete(chatUploads).where(and(eq(chatUploads.id,row.id),eq(chatUploads.requestId,tombstone)));}catch{break;}
 }
}

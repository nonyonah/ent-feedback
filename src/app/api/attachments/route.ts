import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {attachments} from '@/server/db/schema';
import {getDb} from '@/server/db/client';
import {requireBoard,feedbackActor} from '@/server/feedback-access';
import {runService,ServiceError,toResponse} from '@/server/result';
import {sanitizeImage} from '@/server/image-validation';
import {putImage,deleteImage} from '@/server/storage';
import {consumeRateLimit} from '@/server/rate-limit';
export async function POST(request:Request){return toResponse(await runService(async()=>{
 const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==request.headers.get('host'))throw new ServiceError('forbidden','Upload from the feedback board.');
 const reader=request.body?.getReader();if(!reader)throw new ServiceError('validation','Choose an image.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2*1024*1024+128*1024){await reader.cancel();throw new ServiceError('validation','Choose an image under 2 MB.');}chunks.push(part.value);}
 const form=await new Response(Buffer.concat(chunks),{headers:{'content-type':request.headers.get('content-type')??''}}).formData();
 const wid=z.uuid().parse(form.get('workspaceId')),bid=z.uuid().parse(form.get('boardId'));
 await requireBoard(wid,bid);const actor=await feedbackActor(wid,typeof form.get('guestToken')==='string'?String(form.get('guestToken')):undefined);
 await consumeRateLimit('upload:'+wid+':'+(actor.user?.id??actor.guestId),12,60);
 const file=form.get('file');if(!(file instanceof File))throw new ServiceError('validation','Choose an image.');
 const image=await sanitizeImage(Buffer.from(await file.arrayBuffer()));
 const id=randomUUID(),key=`feedback/${wid}/${id}.webp`;
 await putImage(key,image.bytes);
 try{await getDb().insert(attachments).values({id,workspaceId:wid,storageKey:key,mimeType:'image/webp',byteSize:image.bytes.length,width:image.width,height:image.height,uploadedByUserId:actor.user?.id??null,guestActorId:actor.guestId,expiresAt:new Date(Date.now()+86400000)});}catch(error){await deleteImage(key).catch(()=>{});throw error;}
 return {id};
}));}

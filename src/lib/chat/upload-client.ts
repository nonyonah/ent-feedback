import {chatRequest} from './client';
// Reuse uploaded IDs when a send is retried; drafts remain visible until accepted.
const uploads=new Map<string,string>();
export async function uploadChatImages(workspaceId:string,conversationId:string,images:string[],token?:string){
 const ids:string[]=[];
 for(const image of images){const key=conversationId+':'+(token?'visitor':'team')+':'+image;let id=uploads.get(key);if(!id){const blob=await (await fetch(image)).blob();const result=await chatRequest<{id:string}>(`/api/chat/${workspaceId}/${conversationId}/attachments`,{method:'POST',headers:{'Content-Type':blob.type,...(token?{Authorization:'Bearer '+token}:{})},body:blob});id=result.id;uploads.set(key,id);if(uploads.size>30)uploads.delete(uploads.keys().next().value!);}ids.push(id);}
 return ids;
}
export function releaseChatImages(conversationId:string,images:string[],token?:string){for(const image of images)uploads.delete(conversationId+':'+(token?'visitor':'team')+':'+image);}

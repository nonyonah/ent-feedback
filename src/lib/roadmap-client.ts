import type {RoadmapData,RoadmapItem} from './roadmap';
export async function roadmapRequest<T>(url:string,init:RequestInit={},signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{...init,cache:'no-store',headers:{'Content-Type':'application/json',...init.headers},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});const result=await response.json();
 if(!response.ok||result.ok===false)throw Error(result.error?.message??'The roadmap couldn’t be loaded. Try again.');return result.ok===true?result.data:result;
}
export async function loadRoadmap(url:string,signal:AbortSignal){
 let cursor:number|null=0;let merged:RoadmapData={planned:[],in_progress:[],shipped:[],next_cursor:null};
 while(cursor!==null&&!signal.aborted){const page:RoadmapData=await roadmapRequest<RoadmapData>(url+'&cursor='+cursor,{},signal);merged={...page,open_items:page.open_items?[...(merged.open_items??[]),...page.open_items]:merged.open_items,planned:[...merged.planned,...page.planned],in_progress:[...merged.in_progress,...page.in_progress],shipped:[...merged.shipped,...page.shipped]};cursor=page.next_cursor;}
 return merged;
}
export function roadmapItems(data:RoadmapData){return [...(data.open_items??[]),...data.planned,...data.in_progress,...data.shipped];}
export type RoadmapChanges=Partial<Pick<RoadmapItem,'status'|'roadmap_order'|'roadmap_visible'|'public_note'>>&{notify_voters?:boolean;before_id?:string|null;after_id?:string|null};

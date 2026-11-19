import {after} from 'next/server';
import {updateRoadmap} from '@/server/roadmap/service';
import {processRoadmapJobs} from '@/server/roadmap/emails';
import {processChatJobs} from '@/server/chat/notifications';
import {runService,toResponse,ServiceError} from '@/server/result';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const result=await runService(async()=>{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ServiceError('forbidden','Open this workspace to edit its roadmap.');
  const text=await request.text();if(text.length>3000)throw new ServiceError('validation','This update is too large.');
  let changes:unknown;try{changes=JSON.parse(text);}catch{throw new ServiceError('validation','Send a valid roadmap update.');}
  const item=await updateRoadmap((await params).id,changes);after(async()=>{await Promise.allSettled([processRoadmapJobs(1),processChatJobs(1)]);});return item;
 });return toResponse(result);
}

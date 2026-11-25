import {z} from 'zod';
import {readRoadmap,roadmapWorkspace} from '@/server/roadmap/service';
import {limitFeedbackReadRequest} from '@/server/read-budget';
import {runService,toResponse} from '@/server/result';
import {after} from 'next/server';
import {resolveAnalyticsBoard,trackServerAnalytics} from '@/lib/analytics/server';
export async function GET(request:Request){
  const query=new URL(request.url).searchParams;
  const result=await runService(async()=>{await limitFeedbackReadRequest();const {id}=await roadmapWorkspace(query.get('projectKey')??'');const shipped=z.enum(['recent','all']).parse(query.get('shipped')??'recent');return readRoadmap(id,{allShipped:shipped==='all',cursor:query.has('cursor')?Number(query.get('cursor')):0});});
  if(result.ok)after(async()=>{try{const {id}=await roadmapWorkspace(query.get('projectKey')??'');const boardId=await resolveAnalyticsBoard(id);await trackServerAnalytics('roadmap_viewed',{source:'page',surface:'page'},{boardId,defer:false});}catch{}});
  return result.ok?Response.json(result.data,{headers:{'Cache-Control':'no-store'}}):toResponse(result);
}

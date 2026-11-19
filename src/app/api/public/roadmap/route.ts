import {z} from 'zod';
import {readRoadmap,roadmapWorkspace} from '@/server/roadmap/service';
import {limitFeedbackReadRequest} from '@/server/read-budget';
import {runService,toResponse} from '@/server/result';
export async function GET(request:Request){
 const result=await runService(async()=>{await limitFeedbackReadRequest();const query=new URL(request.url).searchParams;const {id}=await roadmapWorkspace(query.get('projectKey')??'');const shipped=z.enum(['recent','all']).parse(query.get('shipped')??'recent');return readRoadmap(id,{allShipped:shipped==='all',cursor:query.has('cursor')?Number(query.get('cursor')):0});});
 return result.ok?Response.json(result.data,{headers:{'Cache-Control':'no-store'}}):toResponse(result);
}

import {readRoadmap} from '@/server/roadmap/service';
import {runService,toResponse} from '@/server/result';
export async function GET(request:Request){const query=new URL(request.url).searchParams;return toResponse(await runService(()=>readRoadmap(query.get('projectId')??'',{admin:true,allShipped:true,cursor:query.has('cursor')?Number(query.get('cursor')):0})));}

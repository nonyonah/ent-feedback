import {roadmapWorkspace} from '@/server/roadmap/service';
import {readPublishedChangelog} from '@/server/changelog/service';
import {limitFeedbackReadRequest} from '@/server/read-budget';
import {runService,toResponse} from '@/server/result';

export async function GET(request:Request){
  const query=new URL(request.url).searchParams;
  const result=await runService(async()=>{
    await limitFeedbackReadRequest();
    const {id}=await roadmapWorkspace(query.get('projectKey')??'');
    const entries=await readPublishedChangelog(id);
    return entries.map(entry=>({slug:entry.slug,title:entry.title,summary:entry.summary,body:entry.body,category:entry.category,publishedAt:entry.publishedAt,coverImage:entry.coverImage??null}));
  });
  return result.ok?Response.json(result.data,{headers:{'Cache-Control':'no-store'}}):toResponse(result);
}

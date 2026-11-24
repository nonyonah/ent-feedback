import {z} from 'zod';
import {getPublicWorkspace} from '@/server/public-workspace';
import {hashAnalyticsVisitor,trackServerAnalytics} from '@/lib/analytics/server';

const bodySchema=z.object({projectKey:z.string().trim().min(2).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),visitorId:z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),type:z.enum(['widget_opened','roadmap_viewed']),surface:z.enum(['widget','board']).default('widget'),board:z.string().trim().min(1).max(80).optional()}).strict();
const buckets=new Map<string,{count:number;resetAt:number}>();
function allow(key:string){
 const now=Date.now();let bucket=buckets.get(key);
 if(!bucket||bucket.resetAt<=now){bucket={count:0,resetAt:now+60_000};buckets.set(key,bucket);}
 if(buckets.size>10_000)for(const [entry,value] of buckets)if(value.resetAt<=now)buckets.delete(entry);
 if(bucket.count>=8)return false;
 bucket.count++;return true;
}
export async function POST(request:Request){
 try{
  const body=bodySchema.parse(await request.json());
  const workspace=await getPublicWorkspace(body.projectKey);
  const boardId=(body.board?workspace?.boards.find(board=>board.slug===body.board)?.id:undefined)??workspace?.boards[0]?.id;
  if(!workspace||!boardId||!hashAnalyticsVisitor(body.visitorId,boardId))return new Response(null,{status:204});
  if(!allow(boardId+':'+body.visitorId))return new Response(null,{status:204});
  if(body.type==='widget_opened')trackServerAnalytics('widget_opened',{source:'widget',surface:body.surface},{boardId,visitorId:body.visitorId});
  else trackServerAnalytics('roadmap_viewed',{source:'widget',surface:'widget'},{boardId,visitorId:body.visitorId});
 }catch{}
 return new Response(null,{status:204});
}

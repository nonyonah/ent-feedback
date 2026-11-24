'use server';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {mergeFeedback} from '@/server/feedback/merge';
import {runService} from '@/server/result';

export async function mergeFeedbackAction(workspaceId:string,sourceId:string,targetId:string){
 return runService(async()=>{
  const wid=z.uuid().parse(workspaceId),source=z.uuid().parse(sourceId),target=z.uuid().parse(targetId),user=await requireAppUser(),db=getDb();
  await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
  await consumeRateLimit('feedback:merge:'+wid+':'+user.id,20,3600);
  await db.transaction(tx=>mergeFeedback(tx,wid,source,target));
  return {sourceId:source,targetId:target};
 });
}

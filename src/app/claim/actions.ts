'use server';
import {cookies} from 'next/headers';
import {requireAppUser} from '@/server/auth';
import {claimCookie,claimPreview} from '@/server/preview-claims';
import {runService} from '@/server/result';
import {trackServerAnalytics} from '@/lib/analytics/server';

export async function acceptPreview(){
  return runService(async()=>{
    const user=await requireAppUser();
    const jar=await cookies();
    const result=await claimPreview(jar.get(claimCookie)?.value??'',user.id);
    jar.set(claimCookie,'',{path:'/claim',maxAge:0});
    trackServerAnalytics('board_claimed',{}, {boardId:result.boardId,user});
    trackServerAnalytics('board_created',{}, {boardId:result.boardId,user});
    return {id:result.workspaceId,user:user.clerkUserId};
  });
}

'use server';
import {revalidatePath} from 'next/cache';
import {getServerEnv} from '@/server/env';
import {trackServerAnalytics} from '@/lib/analytics/server';
import {createPreview,managePreview,requireFounder} from '@/server/preview-claims';
import {runService} from '@/server/result';
import {z} from 'zod';

export async function newPreview(form:FormData){
  return runService(async()=>{
    const user=await requireFounder();
    const {token,boardId}=await createPreview({product:String(form.get('product')??''),prospect:String(form.get('prospect')??''),template:String(form.get('template')??'')});
    trackServerAnalytics('preview_board_created',{}, {boardId,user});
    revalidatePath('/founder/previews');
    return getServerEnv().NEXT_PUBLIC_APP_URL+'/claim/open#'+token;
  });
}
export async function changePreview(id:string,action:'extend'|'delete'){
  return runService(async()=>{
    await requireFounder();
    await managePreview(id,z.enum(['extend','delete']).parse(action));
    revalidatePath('/founder/previews');
  });
}

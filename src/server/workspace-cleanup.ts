import 'server-only';
import {and,asc,eq,lte,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {jobs} from '@/server/db/schema';
import {deleteImage} from '@/server/storage';

/** Each object key survives workspace deletion until storage confirms deletion. */
export async function cleanDeletedWorkspaceFiles(limit=3){
 const db=getDb();let deleted=0,failed=0;
 for(let i=0;i<Math.min(limit,10);i++){
  const found=await db.transaction(async tx=>{
   const [job]=await tx.select().from(jobs).where(and(eq(jobs.type,'workspace_file_cleanup'),eq(jobs.status,'pending'),lte(jobs.runAt,new Date()))).orderBy(asc(jobs.createdAt)).limit(1).for('update',{skipLocked:true});if(!job)return false;
   try{await deleteImage(z.string().min(1).max(1024).parse(job.payload.storageKey));await tx.delete(jobs).where(eq(jobs.id,job.id));deleted++;}
   catch{await tx.update(jobs).set({attempts:sql`least(${jobs.attempts}+1,${jobs.maxAttempts})`,runAt:new Date(Date.now()+3600000),lastError:'Storage deletion failed',updatedAt:new Date()}).where(eq(jobs.id,job.id));failed++;}
   return true;
  });if(!found||failed)break;
 }
 return {deleted,failed};
}

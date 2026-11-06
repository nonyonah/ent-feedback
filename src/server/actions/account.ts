'use server';
import {clerkClient} from '@clerk/nextjs/server';
import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {users} from '@/server/db/schema';
import {runService} from '@/server/result';
export async function saveAccountProfileAction(input:{firstName:string;lastName:string}){
 return runService(async()=>{
  const profile=z.object({firstName:z.string().trim().min(1,'Enter your first name.').max(80),lastName:z.string().trim().min(1,'Enter your last name.').max(80)}).parse(input);
  const actor=await requireAppUser();
  const client=await clerkClient();
  const user=await client.users.updateUser(actor.clerkUserId,profile);
  await getDb().update(users).set({name:[user.firstName,user.lastName].filter(Boolean).join(' '),avatarUrl:user.hasImage?user.imageUrl:null,updatedAt:new Date()}).where(eq(users.id,actor.id));
  return {saved:true};
 });
}

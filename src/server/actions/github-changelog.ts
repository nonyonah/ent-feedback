'use server';
import {randomBytes} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {githubChangelogConnections} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {seal} from '@/server/integration-crypto';
import {runService,ServiceError} from '@/server/result';
import {requireWorkspaceRole} from '@/server/services/access';
const id=z.string().uuid();
const repository=z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,'Use the repository name in owner/repository format.');
export async function getGithubChangelogAction(workspaceId:string){return runService(async()=>{
 const user=await requireAppUser(),wid=id.parse(workspaceId),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 const [connection]=await db.select({id:githubChangelogConnections.id,repository:githubChangelogConnections.repository}).from(githubChangelogConnections).where(eq(githubChangelogConnections.workspaceId,wid));
 return connection??null;
});}
export async function connectGithubChangelogAction(workspaceId:string,repo:string){return runService(async()=>{
 const user=await requireAppUser(),wid=id.parse(workspaceId),name=repository.parse(repo).toLowerCase(),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key||Buffer.from(key,'base64').length!==32)throw new ServiceError('conflict','GitHub changelog automation is not configured on this server.');
 const secret=randomBytes(32).toString('hex');const [connection]=await db.insert(githubChangelogConnections).values({workspaceId:wid,repository:name,encryptedSecret:seal({secret},key,wid+':github-changelog'),createdByUserId:user.id})
 .onConflictDoUpdate({target:githubChangelogConnections.workspaceId,set:{repository:name,encryptedSecret:seal({secret},key,wid+':github-changelog'),createdByUserId:user.id,updatedAt:new Date()}}).returning({id:githubChangelogConnections.id,repository:githubChangelogConnections.repository});
 return {...connection,secret};
});}
export async function disconnectGithubChangelogAction(workspaceId:string){return runService(async()=>{
 const user=await requireAppUser(),wid=id.parse(workspaceId),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});await db.delete(githubChangelogConnections).where(eq(githubChangelogConnections.workspaceId,wid));return {disconnected:true};
});}

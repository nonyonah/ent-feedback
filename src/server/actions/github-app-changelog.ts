'use server';
import {randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {isUniqueViolation} from '@/server/db/errors';
import {githubAppChangelogConnections} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {seal,unseal} from '@/server/integration-crypto';
import {githubSelectionState,listAccessibleGithubRepositories,listClosedPullRequests} from '@/server/connected-apps/github-app';
import {githubHistoricalChangelogDraft} from '@/lib/github-changelog';
import {saveGithubChangelogDraft} from '@/server/connected-apps/github-changelog-drafts';
import {runService,ServiceError} from '@/server/result';

async function selection(workspaceId:string){
 const user=await requireAppUser(),wid=z.uuid().parse(workspaceId),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)throw new ServiceError('conflict','The GitHub App is not configured yet.');
 let state:z.infer<typeof githubSelectionState>;try{state=githubSelectionState.parse(unseal((await cookies()).get('ent-github-selection')?.value??'',key,'github-selection'));}catch{throw new ServiceError('conflict','Your GitHub authorization has expired. Connect again.');}
 if(state.expires<=Date.now()||state.workspaceId!==wid||state.userId!==user.id)throw new ServiceError('forbidden','Your GitHub authorization is no longer valid for this workspace.');
 return {state,user,db,wid};
}
export async function githubAppConnectionAction(workspaceId:string){return runService(async()=>{const user=await requireAppUser(),wid=z.uuid().parse(workspaceId),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});const [row]=await db.select({repository:githubAppChangelogConnections.repository}).from(githubAppChangelogConnections).where(eq(githubAppChangelogConnections.workspaceId,wid));return row??null;});}
export async function startGithubAppAction(workspaceId:string){return runService(async()=>{const user=await requireAppUser(),wid=z.uuid().parse(workspaceId);await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'admin'});const e=getServerEnv();if(!e.GITHUB_APP_SLUG||!e.GITHUB_APP_CLIENT_ID||!e.GITHUB_APP_CLIENT_SECRET||!e.GITHUB_APP_WEBHOOK_SECRET||!e.INTEGRATION_ENCRYPTION_KEY||Buffer.from(e.INTEGRATION_ENCRYPTION_KEY,'base64').length!==32)throw new ServiceError('conflict','The GitHub App is not configured yet.');const nonce=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url'),jar=await cookies();jar.set('ent-github-selection','',{path:'/',maxAge:0});jar.set('ent-github-app',seal({nonce,verifier,userId:user.id,workspaceId:wid,expires:Date.now()+600000},e.INTEGRATION_ENCRYPTION_KEY,'github-app'),{httpOnly:true,secure:new URL(e.NEXT_PUBLIC_APP_URL).protocol==='https:',sameSite:'lax',path:'/api/integrations/github/app',maxAge:600});const url=new URL(`https://github.com/apps/${encodeURIComponent(e.GITHUB_APP_SLUG)}/installations/new`);url.searchParams.set('state',nonce);return {url:url.href};});}
export async function listGithubAppRepositoriesAction(workspaceId:string){return runService(async()=>{const {state}=await selection(workspaceId);return listAccessibleGithubRepositories(state.token,state.installationId);});}
export async function chooseGithubAppRepositoryAction(workspaceId:string,repositoryId:number){return runService(async()=>{const {state,user,db,wid}=await selection(workspaceId);const id=z.number().int().positive().parse(repositoryId);const result=await listAccessibleGithubRepositories(state.token,state.installationId);const repository=result.repositories.find(row=>row.id===id);if(!repository)throw new ServiceError('forbidden','This repository is no longer available. Reconnect to GitHub.');try{await db.insert(githubAppChangelogConnections).values({workspaceId:wid,installationId:state.installationId,repositoryId:String(repository.id),repository:repository.full_name,createdByUserId:user.id}).onConflictDoUpdate({target:githubAppChangelogConnections.workspaceId,set:{installationId:state.installationId,repositoryId:String(repository.id),repository:repository.full_name,createdByUserId:user.id,updatedAt:new Date()}});}catch(error){if(isUniqueViolation(error))throw new ServiceError('conflict','This GitHub installation is already connected to another workspace. Disconnect it there first.');throw error;}const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY!;(await cookies()).set('ent-github-selection',seal({...state,repositoryId:repository.id},key,'github-selection'),{httpOnly:true,secure:new URL(getServerEnv().NEXT_PUBLIC_APP_URL).protocol==='https:',sameSite:'lax',path:'/',maxAge:Math.max(1,Math.floor((state.expires-Date.now())/1000))});return {repository:repository.full_name};});}
export async function disconnectGithubAppAction(workspaceId:string){return runService(async()=>{const user=await requireAppUser(),wid=z.uuid().parse(workspaceId),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});await db.delete(githubAppChangelogConnections).where(eq(githubAppChangelogConnections.workspaceId,wid));return {disconnected:true};});}

/** Import one page at a time; webhook delivery and history share the same receipt. */
export async function importGithubChangelogPageAction(workspaceId:string,page:number){return runService(async()=>{
 const {state,db,wid}=await selection(workspaceId),currentPage=z.number().int().min(1).max(100000).parse(page);
 if(!state.repositoryId)throw new ServiceError('conflict','Choose a repository before importing.');
 const match=and(eq(githubAppChangelogConnections.workspaceId,wid),eq(githubAppChangelogConnections.installationId,state.installationId),eq(githubAppChangelogConnections.repositoryId,String(state.repositoryId)));
 const [connection]=await db.select().from(githubAppChangelogConnections).where(match);if(!connection)throw new ServiceError('conflict','The GitHub connection changed. Connect again.');
 const pulls=await listClosedPullRequests(state.token,connection.repository,currentPage);
 const drafts=pulls.map(pull=>githubHistoricalChangelogDraft(pull,connection.repository)).filter((draft):draft is NonNullable<typeof draft>=>draft!==null);
 const imported=await db.transaction(async tx=>{const [active]=await tx.select().from(githubAppChangelogConnections).where(and(eq(githubAppChangelogConnections.id,connection.id),match)).for('update');if(!active)throw new ServiceError('conflict','The GitHub connection changed. Connect again.');let count=0;for(const draft of drafts)if(await saveGithubChangelogDraft(tx,active,draft,draft.mergedAt))count++;return count;});
 const nextPage=pulls.length===30?currentPage+1:null;if(!nextPage)(await cookies()).set('ent-github-selection','',{path:'/',maxAge:0});
 return {imported,nextPage};
});}

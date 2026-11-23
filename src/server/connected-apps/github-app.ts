import 'server-only';
import {z} from 'zod';
export const githubAppState=z.object({nonce:z.string(),userId:z.uuid(),workspaceId:z.uuid(),expires:z.number(),verifier:z.string().min(43),installationId:z.string().regex(/^\d+$/).optional()});
export const githubSelectionState=z.object({userId:z.uuid(),workspaceId:z.uuid(),installationId:z.string().regex(/^\d+$/),token:z.string().min(1).max(1024),expires:z.number(),repositoryId:z.number().int().positive().optional()});
const repositoriesSchema=z.object({repositories:z.array(z.object({id:z.number().int().positive(),full_name:z.string()}))});
export async function githubApi(url:string,token:string){const response=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('GitHub request failed');return response.json();}
/** Fetch only repositories accessible to both this user and this installation. */
export async function listAccessibleGithubRepositories(token:string,installationId:string){
 const repositories:{id:number;full_name:string}[]=[];
 for(let page=1;page<=10;page++){const result=repositoriesSchema.parse(await githubApi(`https://api.github.com/user/installations/${installationId}/repositories?per_page=100&page=${page}`,token));repositories.push(...result.repositories);if(result.repositories.length<100)return {repositories,truncated:false};}
 return {repositories,truncated:true};
}

/** Each bounded page can be retried without exposing the GitHub token to the browser. */
export async function listClosedPullRequests(token:string,repository:string,page:number){
 const segments=repository.split('/');if(segments.length!==2||segments.some(part=>!part||part==='.'||part==='..'||!/^[A-Za-z0-9_.-]+$/.test(part)))throw Error('Invalid repository');
 return z.array(z.unknown()).max(30).parse(await githubApi(`https://api.github.com/repos/${encodeURIComponent(segments[0])}/${encodeURIComponent(segments[1])}/pulls?state=closed&sort=created&direction=asc&per_page=30&page=${page}`,token));
}

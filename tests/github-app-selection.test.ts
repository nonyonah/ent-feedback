import {test} from 'node:test';
import assert from 'node:assert/strict';
import {githubAppState,githubSelectionState,listAccessibleGithubRepositories} from '../src/server/connected-apps/github-app';

test('installation state does not require a repository name',()=>{
 const state={nonce:'n',userId:'6e5cc82f-5ee6-48d4-a6b4-d5c9b930220e',workspaceId:'8b5a2aa1-b314-4af0-af77-caa3d4744c2e',expires:Date.now()+1000,verifier:'a'.repeat(43),installationId:'123'};
 assert.equal(githubAppState.safeParse(state).success,true);
 assert.equal(githubSelectionState.safeParse({...state,token:'user-token'}).success,true);
 assert.equal(githubSelectionState.safeParse({...state,token:'user-token',installationId:'../evil'}).success,false);
});
test('repository selection uses the user installation API and handles pagination',async()=>{
 const original=globalThis.fetch;const calls:string[]=[];
 try{globalThis.fetch=async(input,init)=>{const url=String(input);calls.push(url);assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-token');const page=new URL(url).searchParams.get('page');const repositories=page==='1'?Array.from({length:100},(_,i)=>({id:i+1,full_name:`owner/repo-${i+1}`})):[{id:101,full_name:'owner/last'}];return Response.json({repositories});};const result=await listAccessibleGithubRepositories('test-token','42');assert.equal(result.repositories.length,101);assert.equal(result.repositories[100].full_name,'owner/last');assert.equal(result.truncated,false);assert.ok(calls.every(url=>url.startsWith('https://api.github.com/user/installations/42/repositories?')));}finally{globalThis.fetch=original;}
});

test('historical pull requests use the authorized repository and bounded stable pages',async()=>{
 const {listClosedPullRequests}=await import('../src/server/connected-apps/github-app');const original=globalThis.fetch;
 try{globalThis.fetch=async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,'https://api.github.com');assert.equal(url.pathname,'/repos/owner/project/pulls');assert.equal(url.searchParams.get('state'),'closed');assert.equal(url.searchParams.get('sort'),'created');assert.equal(url.searchParams.get('direction'),'asc');assert.equal(url.searchParams.get('per_page'),'30');assert.equal(url.searchParams.get('page'),'2');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-token');return Response.json([{id:123}]);};assert.deepEqual(await listClosedPullRequests('test-token','owner/project',2),[{id:123}]);await assert.rejects(()=>listClosedPullRequests('test-token','owner/../secret',1));await assert.rejects(()=>listClosedPullRequests('test-token','owner/..',1));}finally{globalThis.fetch=original;}
});

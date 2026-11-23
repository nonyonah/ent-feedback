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

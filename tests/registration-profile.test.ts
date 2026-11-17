import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('Ent profile collection saves to the authenticated Clerk account and app user before advancing',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-profile-test-');
 try{
  const outfile=directory+'/profile.mjs';
  const mocks:Record<string,string>={
   'server-only':'',
   'profile-fixture':`export const fixture={calls:[],failure:null};`,
   '@clerk/nextjs/server':`import {fixture} from 'profile-fixture'; export async function clerkClient(){return {users:{
    async updateUser(id,profile){fixture.calls.push({kind:'clerk',id,profile});if(fixture.failure==='clerk')throw Error('Provider unavailable');return {...profile,hasImage:true,imageUrl:'https://images.example/avatar.png'};},
    async updateUserMetadata(id,metadata){fixture.calls.push({kind:'progress',id,metadata});}
   }}}`,
   '@/server/onboarding':`import {fixture} from 'profile-fixture';export async function getRegistrationState(){if(fixture.failure==='auth')throw Error('Not authenticated');return {user:{id:'app-user',clerkUserId:'clerk-user'},workspace:null,progress:{complete:false},workspaces:[]};}`,
   '@/server/db/client':`import {fixture} from 'profile-fixture';export function getDb(){return {update:()=>({set:values=>({where:async condition=>{fixture.calls.push({kind:'database',values,condition});if(fixture.failure==='database')throw Error('Database unavailable');}})})};}`,
   '@/server/db/schema':`export const users={id:'user-id-column'};export const lifecycleEmailState={userId:'user-id-column'};`,
   'drizzle-orm':`export const eq=(column,value)=>({column,value});`,
   '@/server/features':`export function requireFeature(){}`,
   '@/server/auth':`export function requireAppUser(){throw Error('Unexpected call');}`,
   '@/server/services/access':`export function requireWorkspaceRole(){throw Error('Unexpected call');}`,
   '@/server/actions/workspaces':`export function createFirstWorkspaceAction(){throw Error('Unexpected call');}`,
  };
  await build({stdin:{contents:`export {saveRegistrationProfileAction} from './src/server/actions/registration';export {fixture} from 'profile-fixture';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'profile-boundaries',setup(b){
   b.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'profile-mock'}:undefined);
   b.onLoad({filter:/.*/,namespace:'profile-mock'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
  const {saveRegistrationProfileAction:save,fixture}=await import(pathToFileURL(outfile).href);
  const reset=(failure:string|null=null)=>{fixture.calls.length=0;fixture.failure=failure;};
  const input={firstName:'  Ada  ',lastName:'  Okafor  '};
  assert.equal((await save(input)).ok,true);
  assert.deepEqual(fixture.calls.map((call:{kind:string})=>call.kind),['clerk','database','progress']);
  assert.deepEqual(fixture.calls[0],{kind:'clerk',id:'clerk-user',profile:{firstName:'Ada',lastName:'Okafor'}});
  assert.equal(fixture.calls[1].values.name,'Ada Okafor');
  assert.equal(fixture.calls[1].values.avatarUrl,'https://images.example/avatar.png');
  assert.deepEqual(fixture.calls[1].condition,{column:'user-id-column',value:'app-user'});
  assert.equal(fixture.calls[2].id,'clerk-user');
  assert.equal(fixture.calls[2].metadata.privateMetadata.entOnboarding.step,1);

  for(const invalid of [{firstName:' ',lastName:'Okafor'},{firstName:'Ada',lastName:''},{...input,clerkUserId:'another-account'},{firstName:'A'.repeat(81),lastName:'Okafor'}]){
   reset();assert.equal((await save(invalid)).ok,false);assert.deepEqual(fixture.calls,[]);
  }
  // Never advance or report success on authentication/provider/database failure.
  const original=console.error;console.error=()=>{};
  try{
   for(const failure of ['auth','clerk','database']){
    reset(failure);assert.equal((await save(input)).ok,false);
    assert.ok(!fixture.calls.some((call:{kind:string})=>call.kind==='progress'));
    if(failure==='auth')assert.equal(fixture.calls.length,0);
    if(failure==='clerk')assert.ok(!fixture.calls.some((call:{kind:string})=>call.kind==='database'));
   }
  }finally{console.error=original;}
  reset();assert.equal((await save(input)).ok,true);
 }finally{await rm(directory,{recursive:true,force:true});}
});

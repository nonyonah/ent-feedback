// Opt-in database concurrency check. Fixture rows are deleted at the end.
//
// Guards four production risks:
//  1. Concurrent sign-ins must not create duplicate accounts.
//  2. Concurrent registration submissions must create exactly one workspace.
//  3. Parallel first loads with one browser token must share one guest identity.
//  4. Concurrent board creation must not exhaust the connection pool.
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import esbuild from 'esbuild';
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required.');
const output=join(mkdtempSync(join(tmpdir(),'ent-concurrency-')),'check.cjs');
const entry=`
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq,inArray} from 'drizzle-orm';
import {getDb,closeDb} from './src/server/db/client';
import {users,workspaces,workspaceMembers,guestActors} from './src/server/db/schema';
import {getOptionalAppUser} from './src/server/auth';
import {createFirstWorkspaceForUser} from './src/server/services/workspaces';
import {feedbackActor} from './src/server/feedback-access';
import {getWorkspaceEntitlements} from './src/server/billing/access';

export async function run(){
 const db=getDb();
 const createdUserIds=[];
 const createdWorkspaceIds=[];
 try{
  // 1. Concurrent first sign-in for one Clerk account.
  const clerkId='concurrency-signin-'+randomUUID();
  global.__clerkUserId=clerkId;
  global.__clerkUser={id:clerkId,primaryEmailAddress:{emailAddress:'concurrency-'+randomUUID()+'@example.com',verification:{status:'verified'}},fullName:'Concurrency Tester',username:'concurrencytester',hasImage:false};
  const signIns=await Promise.allSettled(Array.from({length:12},()=>getOptionalAppUser()));
  assert.equal(signIns.filter(r=>r.status==='fulfilled').length,12,'every concurrent sign-in should succeed');
  const accounts=await db.select().from(users).where(eq(users.clerkUserId,clerkId));
  assert.equal(accounts.length,1,'concurrent sign-in created duplicate accounts');
  const user=accounts[0];
  createdUserIds.push(user.id);

  // 2. Concurrent registration submissions create exactly one workspace.
  const token=randomUUID().slice(0,8);
  const registrations=await Promise.allSettled([
   createFirstWorkspaceForUser({userId:user.id,name:'Concurrency Alpha '+token,handle:'conc-a-'+token}),
   createFirstWorkspaceForUser({userId:user.id,name:'Concurrency Beta '+token,handle:'conc-b-'+token}),
  ]);
  assert.equal(registrations.filter(r=>r.status==='fulfilled').length,2,'both registration submissions should resolve');
  const created=registrations.filter(r=>r.status==='fulfilled').map(r=>r.value);
  assert.equal(new Set(created.map(w=>w.id)).size,1,'concurrent registration returned different workspaces');
  const memberships=await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId,user.id));
  assert.equal(memberships.length,1,'concurrent registration created duplicate memberships');
  createdWorkspaceIds.push(memberships[0].workspaceId);

  // 3. Parallel first loads with one browser token share one guest identity.
  global.__clerkUserId=null;
  global.__clerkUser=null;
  const guestToken=randomUUID().replace(/-/g,'')+randomUUID().replace(/-/g,'');
  const guests=await Promise.allSettled(Array.from({length:6},()=>feedbackActor(memberships[0].workspaceId,guestToken,true)));
  assert.equal(guests.filter(r=>r.status==='fulfilled').length,6,'every parallel load should resolve');
  const guestIds=new Set(guests.filter(r=>r.status==='fulfilled').map(r=>r.value.guestId));
  assert.equal(guestIds.size,1,'parallel loads produced split guest identities');
  const guestRows=await db.select().from(guestActors).where(eq(guestActors.workspaceId,memberships[0].workspaceId));
  assert.equal(guestRows.length,1,'parallel loads created duplicate guest actors');
  // A different browser still gets its own identity.
  const other=await feedbackActor(memberships[0].workspaceId,randomUUID().replace(/-/g,'')+randomUUID().replace(/-/g,''),true);
  assert.notEqual(other.guestId,[...guestIds][0],'distinct browsers must not share an identity');

  // 4. Concurrent board creation must not exhaust the pool.
  // Each request holds a transaction and resolves entitlements on the same
  // connection. A nested pooled query would wait for a second slot and fail.
  const PARALLEL=12;
  const boardRuns=await Promise.allSettled(Array.from({length:PARALLEL},async()=>{
   return db.transaction(async tx=>{
    await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,memberships[0].workspaceId)).for('update');
    await getWorkspaceEntitlements(memberships[0].workspaceId,tx);
    return 'ok';
   });
  }));
  assert.equal(boardRuns.filter(r=>r.status==='fulfilled').length,PARALLEL,'concurrent board creation exhausted the connection pool');
}finally{
 if(createdWorkspaceIds.length)await db.delete(guestActors).where(inArray(guestActors.workspaceId,createdWorkspaceIds));
 if(createdWorkspaceIds.length)await db.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId,createdWorkspaceIds));
 if(createdWorkspaceIds.length)await db.delete(workspaces).where(inArray(workspaces.id,createdWorkspaceIds));
 if(createdUserIds.length)await db.delete(users).where(inArray(users.id,createdUserIds));
 await closeDb();
}
}
`;
await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',banner:{js:`require=require('node:module').createRequire('${process.cwd()}/package.json');`},platform:'node',format:'cjs',outfile:output,plugins:[{name:'boundary',setup(b){b.onResolve({filter:/^server-only$/},(args)=>({path:args.path,namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({loader:'js',resolveDir:process.cwd(),contents:''}));b.onResolve({filter:/^@clerk\/nextjs\/server$/},(args)=>({path:args.path,namespace:'clerk'}));b.onLoad({filter:/.*/,namespace:'clerk'},()=>({loader:'js',resolveDir:process.cwd(),contents:`export async function currentUser(){return global.__clerkUser??null;}export async function auth(){return {userId:global.__clerkUserId??null};}export function clerkClient(){return {users:{updateUser:async()=>({}),updateUserMetadata:async()=>({})}};}`}));}}]});
const loadModule=createRequire(import.meta.url);
try{
 await loadModule(output).run();
 console.log('PASS PostgreSQL concurrency: one account under concurrent sign-in, one workspace under concurrent registration, one guest identity under parallel first loads, and no pool exhaustion under concurrent board creation. Fixture rows deleted; Clerk identity mocked.');
 process.exitCode=0;
}catch(error){
 console.error('Database concurrency check failed:',error.code??error.name,error instanceof Error&&error.name==='AssertionError'?error.message:'');
 process.exitCode=1;
}

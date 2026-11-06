// Real PostgreSQL, in-memory object storage and mocked Clerk. All rows roll back.
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {config} from 'dotenv';
import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const output=join(mkdtempSync(join(tmpdir(),'ent-upload-db-')),'check.cjs');
const entry=`
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {eq} from 'drizzle-orm';
import {getDb,closeDb} from './src/server/db/client';
import {users,workspaces,boards,attachments} from './src/server/db/schema';
import {POST} from './src/app/api/attachments/route';
import {GET} from './src/app/api/attachments/[id]/route';
import {mutateFeedbackAction} from './src/server/actions/feedback';
import {sanitizeImage} from './src/server/image-validation';
import {cleanExpiredAttachments} from './src/server/attachment-cleanup';
export async function run(){
 const rollback=Error('ROLLBACK_FIXTURES');global.uploadObjects=new Map();
 try{await getDb().transaction(async tx=>{
  global.liveBoardTx=tx;await tx.execute('set local statement_timeout=15000');
  const nonce=randomUUID();
  const [owner,other]=await tx.insert(users).values([{clerkUserId:'upload-owner-'+nonce},{clerkUserId:'upload-other-'+nonce}]).returning();
  const [space]=await tx.insert(workspaces).values({name:'Upload '+nonce,handle:'upload-'+nonce}).returning();
  const [board]=await tx.insert(boards).values({workspaceId:space.id,name:'Feedback',handle:'feedback'}).returning();
  global.liveBoardActor=owner;
  const png=await sharp({create:{width:2,height:2,channels:3,background:'#6247aa'}}).png().toBuffer();
  const safe=await sanitizeImage(png);assert.equal((await sharp(safe.bytes).metadata()).format,'webp');
  await assert.rejects(sanitizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  await assert.rejects(sanitizeImage(Buffer.from('not an image')));
  await assert.rejects(sanitizeImage(Buffer.alloc(2*1024*1024+1)));
  async function upload(origin='https://app.example'){
   const form=new FormData();form.set('workspaceId',space.id);form.set('boardId',board.id);form.set('file',new Blob([png],{type:'image/png'}),'photo.png');
   return POST(new Request('https://app.example/api/attachments',{method:'POST',headers:{origin,host:'app.example'},body:form}));
  }
  assert.equal((await upload('https://attacker.example')).status,403);
  const uploaded=await upload();assert.equal(uploaded.status,200);const {data:{id}}=await uploaded.json();
  const fetchImage=()=>GET(new Request('https://app.example/api/attachments/'+id),{params:Promise.resolve({id})});
  assert.equal((await fetchImage()).status,404);
  const [pending]=await tx.select().from(attachments).where(eq(attachments.id,id));assert.equal(pending.status,'pending');assert.ok(pending.expiresAt);
  global.liveBoardActor=other;
  const stolen=await mutateFeedbackAction(space.id,board.id,{type:'create',title:'Attachment theft attempt',description:'Must fail',images:[id]});assert.equal(stolen.ok,false);assert.equal(stolen.error.code,'forbidden');
  global.liveBoardActor=owner;
  const command={type:'create',requestId:randomUUID(),title:'Image feedback persisted',description:'Image details',images:[id]};
  const saved=await mutateFeedbackAction(space.id,board.id,command);assert.ok(saved.ok);assert.equal(saved.data.items[0].images[0],'/api/attachments/'+id);
  assert.ok((await mutateFeedbackAction(space.id,board.id,command)).ok);
  const changedRetry=await mutateFeedbackAction(space.id,board.id,{...command,images:[]});assert.equal(changedRetry.error.code,'conflict');
  const served=await fetchImage();assert.equal(served.status,200);assert.equal(served.headers.get('content-type'),'image/webp');assert.equal(served.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await served.arrayBuffer()),safe.bytes);
  const expired=await upload();const expiredId=(await expired.json()).data.id;await tx.update(attachments).set({expiresAt:new Date(0)}).where(eq(attachments.id,expiredId));
  const cleaned=await cleanExpiredAttachments();assert.equal(cleaned.deleted,1);assert.equal((await tx.select().from(attachments).where(eq(attachments.id,expiredId))).length,0);assert.equal(global.uploadObjects.size,1);
  await tx.update(attachments).set({status:'attached'}).where(eq(attachments.id,id));
  // Soft deletion must immediately make the attachment unavailable.
  const {feedback}=await import('./src/server/db/schema');await tx.update(feedback).set({deletedAt:new Date()}).where(eq(feedback.id,saved.data.createdId));assert.equal((await fetchImage()).status,404);
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}finally{delete global.liveBoardTx;delete global.liveBoardActor;delete global.uploadObjects;await closeDb();}
}`;
await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/^(server-only|@\/server\/(auth|storage|db\/client))$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'js',resolveDir:process.cwd(),contents:a.path==='server-only'?'':a.path.endsWith('/auth')?`export async function getOptionalAppUser(){return global.liveBoardActor}export async function requireAppUser(){return global.liveBoardActor}`:a.path.endsWith('/storage')?`export async function putImage(key,bytes){global.uploadObjects.set(key,bytes)}export async function getImage(key){return global.uploadObjects.get(key)}export async function deleteImage(key){global.uploadObjects.delete(key)}`:`import {getDb as real} from '${process.cwd()}/src/server/db/client.ts';export const getDb=()=>global.liveBoardTx??real();`}));
}}]});
try{await createRequire(import.meta.url)(output).run();console.log('PASS uploads: real image decoding, multipart route, same-origin enforcement, private pending objects, uploader ownership, persisted URLs, idempotent attachment linking, expiry cleanup and deleted-parent visibility. DB fixtures rolled back; storage mocked.');}catch(error){console.error('Upload integration failed:',error.code??error.name);process.exitCode=1;}

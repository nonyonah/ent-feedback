// Offline checks: real notification worker and SQL, mocked database/email transport.
import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {getTableName} from 'drizzle-orm';
import {PgDialect} from 'drizzle-orm/pg-core';
const output=join(mkdtempSync(join(tmpdir(),'ent-feedback-delivery-')),'worker.cjs');
const dialect=new PgDialect();const queries=[];let current,guest,notice;let following=true;const emails=[];let fail=false;
function query(rows){const builder={then:(resolve,reject)=>Promise.resolve(rows()).then(resolve,reject)};for(const name of ['where','orderBy','limit','for'])builder[name]=value=>{if(name==='where'&&value)queries.push(dialect.sqlToQuery(value));return builder;};return builder;}
global.feedbackDb={transaction:fn=>fn(global.feedbackDb),select:()=>({from:table=>{const name=getTableName(table);const builder=query(()=>name==='jobs'?(current.status==='pending'?[{...current}]:[]):name==='feedback'?(guest?[guest]:[]):name==='notifications'?(notice?[notice]:[]):name==='comments'?(guest?.replyAuthor?[{author:guest.replyAuthor}]:[]):name==='follows'?(following?[{id:'follow'}]:[]):[]);builder.innerJoin=()=>builder;builder.leftJoin=()=>builder;return builder;}}),update:table=>({set:patch=>({where:predicate=>{if(getTableName(table)==='jobs'&&dialect.sqlToQuery(predicate).params.includes(current.id))Object.assign(current,patch);const result=Promise.resolve();result.returning=async()=>[{...current}];return result;}})})};
global.feedbackSend=async input=>{if(fail)throw Error('private-provider-token');emails.push(input);};
await esbuild.build({stdin:{contents:"export {processNotificationJobs} from './src/server/notification-worker';",resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/^(server-only|@\/server\/(db\/client|email|env|chat\/notifications))$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'js',contents:a.path==='server-only'?'':a.path.endsWith('/client')?'export const getDb=()=>global.feedbackDb;':a.path.endsWith('/email')?'export const sendActivityEmail=input=>global.feedbackSend(input);':a.path.endsWith('/env')?"export const getServerEnv=()=>({SENDBYTE_API_KEY:'fixture',EMAIL_FROM:'test@example.com'});":'export const enqueueSlack=async()=>{};'}));}}]});
const {processNotificationJobs}=createRequire(import.meta.url)(output);const wid='11111111-1111-4111-8111-111111111111',fid='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
const reset=payload=>{current={id:cid,type:'notification_email',status:'pending',attempts:0,maxAttempts:3,payload,dedupeKey:'fixture',runAt:new Date(0)};guest=null;notice=null;following=true;fail=false;emails.length=0;};
const payload={guestFeedbackId:fid,commentId:cid,workspaceId:wid,to:'guest@example.com',subject:'New reply',title:'Export ideas',url:'https://ent.test/p/example/items/'+fid};
reset(payload);guest={email:payload.to,author:null,replyAuthor:cid};assert.equal((await processNotificationJobs(3,{workspaceId:wid,feedbackId:fid})).succeeded,1);assert.equal(emails.length,1);await processNotificationJobs();assert.equal(emails.length,1);assert.ok(queries.some(query=>query.params.includes(wid)&&query.params.includes(fid)&&query.sql.includes('notificationId')));
reset(payload);guest={email:'changed@example.com',author:null,replyAuthor:cid};await processNotificationJobs();assert.equal(emails.length,0);
reset(payload);guest={email:payload.to,author:null,replyAuthor:null};await processNotificationJobs();assert.equal(emails.length,0);
reset(payload);await processNotificationJobs();assert.equal(emails.length,0);
reset({...payload,notificationId:cid});delete current.payload.guestFeedbackId;notice={recipient:cid,email:payload.to,event:'feedback_comment',postId:fid,preferences:{feedbackComments:false}};await processNotificationJobs();assert.equal(emails.length,0);
reset(payload);guest={email:payload.to,author:null,replyAuthor:cid};fail=true;assert.equal((await processNotificationJobs()).retried,1);assert.equal(current.status,'pending');assert.equal(current.attempts,1);assert.equal(current.lastError,'Email delivery not confirmed');assert.ok(!current.lastError.includes('private-provider'));fail=false;await processNotificationJobs();assert.equal(emails.length,1);
for(const event of ['status_changed','type_changed']){
 reset({...payload,event});delete current.payload.commentId;guest={email:payload.to,author:null};await processNotificationJobs();assert.equal(emails.length,1);
 reset({...payload,event});guest={email:'different@example.com',author:null};await processNotificationJobs();assert.equal(emails.length,0);
 reset({notificationId:cid,to:payload.to,subject:'Update',title:'Export',url:payload.url});notice={recipient:cid,author:cid,email:payload.to,event,postId:fid,preferences:null};following=false;await processNotificationJobs();assert.equal(emails.length,1,'Authors receive updates without a separate follow');
 reset({notificationId:cid,to:payload.to,subject:'Update',title:'Export',url:payload.url});notice={recipient:cid,author:'other',email:payload.to,event,postId:fid,preferences:null};following=false;await processNotificationJobs();assert.equal(emails.length,0,'Unfollowed non-authors are suppressed');
}
for(const [event,key] of [['status_changed','statusChanges'],['type_changed','typeChanges']]){
 reset({notificationId:cid,to:payload.to,subject:'Update',title:'Export',url:payload.url});notice={recipient:cid,author:cid,email:payload.to,event,postId:fid,preferences:{[key]:false}};await processNotificationJobs();assert.equal(emails.length,0,'Saved preferences must suppress an already queued email');
}
console.log('PASS: scoped delivery SQL, guest replies, changed/deleted recipients, anonymous-reply suppression, registered preferences, status/type updates, authors without follows, unfollow suppression, duplicate suppression and sanitized retry handling. No providers contacted.');

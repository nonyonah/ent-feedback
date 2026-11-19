import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaces,boards,feedback} from '@/server/db/schema';
import {mutateFeedbackAction,searchExistingFeedbackAction,loadFeedbackAction} from '@/server/actions/feedback';
declare const global:typeof globalThis&{chatUser:unknown};
function data<T>(result:{ok:true;data:T}|{ok:false;error:{message:string}}):T{if(!result.ok)assert.fail(result.error.message);return result.data;}
export async function run(){
 global.chatUser=null;const db=getDb();
 const [workspace,other]=await db.insert(workspaces).values([{name:'Duplicates',handle:'duplicates-fixture'},{name:'Other',handle:'other-fixture'}]).returning();
 const [first,second,otherBoard]=await db.insert(boards).values([{workspaceId:workspace.id,name:'One',handle:'first'},{workspaceId:workspace.id,name:'Two',handle:'second'},{workspaceId:other.id,name:'Other',handle:'other'}]).returning();
 for(const token of ['a','b','c','e'])data(await loadFeedbackAction(workspace.id,first.id,token.repeat(64)));data(await loadFeedbackAction(other.id,otherBoard.id,'d'.repeat(64)));
 const requestId=randomUUID();const create=(wid:string,bid:string,title:string,category:'feedback'|'bug'|'feature_request',token:string,id=randomUUID())=>mutateFeedbackAction(wid,bid,{type:'create',title,description:'Please add export options.',category,requestId:id},token);
 const results=await Promise.all([create(workspace.id,first.id,'Export options','bug','a'.repeat(64),requestId),create(workspace.id,second.id,'EXPORT   OPTIONS','feature_request','b'.repeat(64))]);
 assert.equal(results.filter(result=>result.ok).length,1);assert.equal(results.filter(result=>!result.ok&&result.error.code==='conflict').length,1);
 assert.equal((await db.select().from(feedback).where(eq(feedback.workspaceId,workspace.id))).length,1);
 const matched=data(await searchExistingFeedbackAction(workspace.id,'export options'));assert.equal(matched.length,1);assert.ok(matched[0].boardId===first.id||matched[0].boardId===second.id);
 assert.equal(data(await searchExistingFeedbackAction(other.id,'export')).length,0);
 assert.equal((await create(workspace.id,first.id,' export options ','feedback','c'.repeat(64))).ok,false);
 const winner=results.findIndex(result=>result.ok);if(winner===0){assert.equal((await create(workspace.id,first.id,'Export options','bug','a'.repeat(64),requestId)).ok,true);}
 assert.equal((await create(other.id,otherBoard.id,'Export options','feedback','d'.repeat(64))).ok,true);
 assert.equal((await create(workspace.id,first.id,'Export options to Excel','feature_request','e'.repeat(64))).ok,true);
 assert.equal((await searchExistingFeedbackAction(workspace.id,'%')).ok,false); // invalid queries never become unbounded wildcard searches
 console.log('PASS: concurrent cross-board/type duplicates blocked, title case/spacing normalized, workspace isolation, distinct requests allowed, and idempotent retries preserved.');
}

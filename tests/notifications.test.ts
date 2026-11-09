import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getTableName,type SQL} from 'drizzle-orm';
import {PgDialect} from 'drizzle-orm/pg-core';
import {publishActivity,wantsActivity,type ActivityType} from '../src/server/activity';
import type {notificationPreferences} from '../src/server/db/schema';

process.env.DATABASE_URL='postgres://test:test@localhost/test';
process.env.NEXT_PUBLIC_APP_URL='http://localhost:3000';
const preferences=(userId:string,changes:Partial<typeof notificationPreferences.$inferSelect>={})=>({id:'pref-'+userId,userId,notificationEmail:null,newFeedback:true,feedbackComments:true,commentReplies:true,commentReactions:true,feedbackReactions:true,createdAt:new Date(0),updatedAt:new Date(0),...changes});
type Tx=Parameters<typeof publishActivity>[0];
async function activity(type:ActivityType,options:{parent?:string;actor?:string;prefs?:ReturnType<typeof preferences>[]}={}){
 const writes:Record<string,Record<string,unknown>[]>={};
 const rows:Record<string,unknown[]>={feedback:[{id:'post',authorUserId:'author'}],workspaces:[{handle:'workspace',name:'Workspace'}],follows:[{id:'follower'}],workspace_members:[{id:'owner'}],comments:[{author:'commenter'}],users:['author','follower','owner','commenter'].map(id=>({id,email:id+'@example.com'})),notification_preferences:options.prefs??[]};
 const tx={select:()=>({from:(table:Parameters<typeof getTableName>[0])=>{let data=rows[getTableName(table)]??[];const query={where:(condition:SQL)=>{if(getTableName(table)==='users'){const {params}=new PgDialect().sqlToQuery(condition);data=data.filter(row=>params.includes((row as {id:string}).id));}return query;},limit:async()=>data,then:(resolve:(value:unknown[])=>unknown)=>Promise.resolve(data).then(resolve)};return query;}}),insert:(table:Parameters<typeof getTableName>[0])=>({values:(value:Record<string,unknown>)=>{const key=getTableName(table);(writes[key]??=[]).push(value);return {onConflictDoNothing:()=>({returning:async()=>[{id:'notice-'+writes[key].length}]})};}})} as unknown as Tx;
 await publishActivity(tx,{type,workspaceId:'workspace',feedbackId:'post',eventId:'event',actorId:options.actor,commentId:type==='comment_reaction'||type==='feedback_comment'?'comment':undefined,parentCommentId:options.parent});
 return writes;
}

test('each of the five preferences independently suppresses its event',()=>{
 const pairs=[['new_feedback','newFeedback'],['feedback_comment','feedbackComments'],['comment_reply','commentReplies'],['comment_reaction','commentReactions'],['feedback_reaction','feedbackReactions']] as const;
 for(const[event,key]of pairs){const p=preferences('recipient',{[key]:false});assert.equal(wantsActivity(p,event),false);for(const[other]of pairs)if(other!==event)assert.equal(wantsActivity(p,other),true);}
 assert.equal(wantsActivity(undefined,'new_feedback'),true);
 assert.equal(wantsActivity(preferences('recipient',{newFeedback:false,feedbackComments:false,commentReplies:false,commentReactions:false,feedbackReactions:false}),'status_changed'),true);
});
test('new feedback reaches owners; self-notifications are excluded',async()=>{
 assert.deepEqual((await activity('new_feedback')).notifications.map(n=>n.recipientUserId),['owner']);
 assert.equal((await activity('new_feedback',{actor:'owner'})).notifications,undefined);
});
test('comments reach owners, followers, and post authors, once per recipient',async()=>{
 const result=await activity('feedback_comment');assert.deepEqual(result.notifications.map(n=>n.recipientUserId).sort(),['author','follower','owner']);assert.equal(result.jobs.length,3);
});
test('reply preference is independent from general comments',async()=>{
 const result=await activity('feedback_comment',{parent:'parent',prefs:[preferences('commenter',{feedbackComments:false,commentReplies:true})]});
 assert.equal(result.notifications.find(n=>n.recipientUserId==='commenter')?.eventType,'comment_reply');
 const disabled=await activity('feedback_comment',{parent:'parent',prefs:[preferences('commenter',{commentReplies:false})]});assert.equal(disabled.notifications.some(n=>n.recipientUserId==='commenter'),false);
});
test('reaction events notify the relevant author and respect both reaction switches',async()=>{
 assert.deepEqual((await activity('feedback_reaction')).notifications.map(n=>n.recipientUserId),['author']);
 assert.deepEqual((await activity('comment_reaction')).notifications.map(n=>n.recipientUserId),['commenter']);
 const off=await activity('feedback_reaction',{prefs:[preferences('author',{feedbackReactions:false})]});assert.equal(off.notifications,undefined);assert.equal(off.jobs,undefined);
 const commentOff=await activity('comment_reaction',{prefs:[preferences('commenter',{commentReactions:false})]});assert.equal(commentOff.notifications,undefined);
});
test('disabled new-feedback and comment preferences suppress notices and email jobs',async()=>{
 assert.equal((await activity('new_feedback',{prefs:[preferences('owner',{newFeedback:false})]})).jobs,undefined);
 const result=await activity('feedback_comment',{prefs:['author','follower','owner'].map(id=>preferences(id,{feedbackComments:false}))});assert.equal(result.notifications,undefined);assert.equal(result.jobs,undefined);
});

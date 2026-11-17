import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackCursor,parseFeedbackCursor} from '../src/lib/feedback-pagination';
import {mergeFeedbackItem} from '../src/lib/merge-feedback';
import type {FeedbackItemData} from '../src/lib/feedback-data';
const id='00000000-0000-4000-a000-000000000001';
test('page cursors reject malformed or oversized client input and preserve timestamp/id ties',()=>{
 const row={id,created:new Date('2026-11-17T00:00:00Z')};
 assert.deepEqual(parseFeedbackCursor(feedbackCursor(row)),{id,at:row.created.toISOString()});
 for(const value of ['invalid','x'.repeat(200),JSON.stringify({id,at:'bad-date'}),JSON.stringify({id:'not-an-id',at:row.created.toISOString()})])assert.throws(()=>parseFeedbackCursor(value));
});
const comment=(id:string)=>({id,author:'Visitor',initials:'',body:id,time:'Now',kind:'user' as const});
const item=(comments:string[],count:number):FeedbackItemData=>({id,boardId:id,title:'Title',description:'Body',votes:1,voted:false,status:'open',author:'Visitor',initials:'',createdAt:'Now',createdOrder:1,commentCount:count,comments:comments.map(comment),nextCommentCursor:'cursor',statusHistory:[],historyCount:0,nextHistoryCursor:null});
test('refresh retains earlier activity, deduplicates updates and keeps a safe cursor if a gap remains',()=>{
 const old=item(['one','two','three'],4),next=item(['three','four'],4);
 const merged=mergeFeedbackItem(old,next);assert.deepEqual(merged.comments.map(c=>c.id),['one','two','three','four']);assert.equal(merged.nextCommentCursor,null);
 const gap=mergeFeedbackItem(old,item(['five','six'],6));assert.equal(gap.comments.length,5);assert.equal(gap.nextCommentCursor,'cursor');
});

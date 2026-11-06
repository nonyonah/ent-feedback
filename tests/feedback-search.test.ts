import assert from 'node:assert/strict';
import {test} from 'node:test';
import {searchFeedback} from '../src/lib/feedback-search';
import type {FeedbackItemData} from '../src/lib/feedback-data';
const base:FeedbackItemData={id:'one',boardId:'product',title:'Keyboard shortcuts',description:'Navigate requests without a mouse',author:'Alex',category:'feature_request',tags:[{id:'mobile',name:'Mobile'}],status:'open',votes:0,voted:false,initials:'',createdAt:'Just now',createdOrder:1,comments:[]};
const items=[base,{...base,id:'two',title:'Crashes on startup',description:'App closes immediately',author:'Jordan',category:'bug' as const,tags:[],createdOrder:2}];
const boards=new Map([['product','Product feedback']]);
test('matches titles, details, authors, types, tags and board names without case sensitivity',()=>{
 for(const query of ['SHORTCUTS','without a mouse','Alex','feature request','mobile'])assert.equal(searchFeedback(items,query,boards)[0]?.id,'one');
 assert.deepEqual(searchFeedback(items,'Product feedback',boards).map(item=>item.id),['two','one']);
 assert.equal(searchFeedback(items,'bugs Jordan',boards)[0]?.id,'two');
 assert.equal(searchFeedback(items,'requests Alex',boards)[0]?.id,'one');
 assert.equal(searchFeedback(items,'bug Jordan',boards)[0]?.id,'two');
});
test('all query terms must match and no matches returns an empty list',()=>{
 assert.deepEqual(searchFeedback(items,'shortcuts Jordan',boards),[]);
 assert.deepEqual(searchFeedback(items,'unfindable',boards),[]);
});
test('blank searches show newest first without modifying source order',()=>{
 assert.deepEqual(searchFeedback(items,'  ',boards).map(item=>item.id),['two','one']);
 assert.deepEqual(items.map(item=>item.id),['one','two']);
});

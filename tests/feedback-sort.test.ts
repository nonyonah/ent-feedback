import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compareFeedback,getTrendingIds,trendingScore} from '../src/lib/feedback-sort';
import type {FeedbackItemData} from '../src/lib/feedback-data';
const post=(id:string,votes=1,discussion=0,boardId='board-a'):FeedbackItemData=>({id,boardId,votes,comments:Array.from({length:discussion},(_,i)=>({id:String(i),author:'User',initials:'',time:'Now',body:'Comment',kind:'user'})),title:id,description:'Details',status:'open',author:'User',initials:'',createdAt:'Just now',createdOrder:1,voted:false});
test('discussion and votes both drive default engagement ordering; other sorts remain available',()=>{
 const voted=post('votes',5),discussed=post('comments',1,3);
 assert.equal(trendingScore(discussed),7);
 assert.deepEqual([voted,discussed].sort((a,b)=>compareFeedback('trending',a,b)).map(p=>p.id),['comments','votes']);
 assert.equal([voted,discussed].sort((a,b)=>compareFeedback('top',a,b))[0].id,'votes');
 assert.equal([voted,{...discussed,createdOrder:2}].sort((a,b)=>compareFeedback('newest',a,b))[0].id,'comments');
});
test('new boards do not trend from their initial self vote; empty input is safe',()=>{
 assert.equal(getTrendingIds([]).size,0);
 assert.equal(getTrendingIds([post('new')]).size,0);
 assert.equal(getTrendingIds([post('active',1,3)]).has('active'),true);
});
test('trending cutoff is board-scoped, includes ties and ignores filters/display age',()=>{
 const items=[post('first',10),post('tied',10),...Array.from({length:8},(_,i)=>post('quiet'+i)),post('other-board',5,0,'board-b')];
 assert.deepEqual([...getTrendingIds(items)].sort(),['first','other-board','tied']);
 assert.deepEqual([...getTrendingIds(items.map(p=>({...p,createdAt:'100d ago'})))].sort(),['first','other-board','tied']);
 assert.equal(items[0].id,'first');
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMutationQueue} from '../src/lib/mutation-queue';
test('overlapping writes execute in order without rejecting the second action',async()=>{
 const queue=createMutationQueue(),events:string[]=[];let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const first=queue.run(async()=>{events.push('first started');await gate;events.push('first finished');return 1;});
 const second=queue.run(async()=>{events.push('second started');return 2;});
 await Promise.resolve();assert.deepEqual(events,['first started']);release();
 assert.deepEqual(await Promise.all([first,second]),[1,2]);assert.deepEqual(events,['first started','first finished','second started']);
});
test('a failed write does not leave the queue locked',async()=>{
 const queue=createMutationQueue();const failed=queue.run(async()=>{throw Error('Save failed');});
 const next=queue.run(async()=>42);await assert.rejects(failed,/Save failed/);assert.equal(await next,42);
});

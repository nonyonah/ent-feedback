import assert from 'node:assert/strict';
import {test} from 'node:test';
import {completedSlackBlocks} from '../src/lib/chat/slack-suggestion';

test('completing one suggestion replaces only its action and preserves status controls',()=>{
 const review=(id:string)=>({type:'section',accessory:{action_id:'ent_chat_review_feature',url:'https://ent.test/dashboard/conversations?suggest='+id}});
 const status={type:'actions',elements:[{action_id:'ent_chat_status_resolved'}]};
 const original=[review('one'),review('two'),status];
 const updated=completedSlackBlocks(original,'one')!;
 assert.match(JSON.stringify(updated[0]),/Added to board/);
 assert.equal(updated[1],original[1]);assert.equal(updated[2],status);
 assert.equal(completedSlackBlocks(updated,'one'),null,'retries are harmless');
 assert.equal(completedSlackBlocks(original,'missing'),null);
 assert.ok('accessory' in original[0],'does not mutate the original payload');
});

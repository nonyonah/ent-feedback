import test from 'node:test';
import assert from 'node:assert/strict';
import {operatorOnline} from '../src/lib/chat/presence';
import {readSlackPresence} from '../src/server/chat/slack-presence-client';

test('online presence expires and cannot survive a Slack disconnect or reconnection',()=>{
 const now=Date.parse('2026-11-16T12:00:00Z');
 assert.equal(operatorOnline({appSeenAt:new Date(now-30000)},null,now),true);
 assert.equal(operatorOnline({appSeenAt:new Date(now-90000)},null,now),false);
 const slack={slackCheckedAt:new Date(now-30000),slackOnline:true,slackConnectionVersion:'connection:1'};
 assert.equal(operatorOnline(slack,'connection:1',now),true);
 assert.equal(operatorOnline(slack,null,now),false);
 assert.equal(operatorOnline(slack,'connection:2',now),false);
 assert.equal(operatorOnline({...slack,slackCheckedAt:new Date(now-120000)},'connection:1',now),false);
 assert.equal(operatorOnline({...slack,slackOnline:false},'connection:1',now),false);
});

test('Slack presence uses GET parameters, exact member mapping and cached IDs',async()=>{
 const calls:URL[]=[];
 const transport=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=new URL(String(input));calls.push(url);assert.equal(init?.body,undefined);return Response.json(url.pathname.endsWith('lookupByEmail')?{ok:true,user:{id:'U123',profile:{email:'admin@example.com'}}}:{ok:true,presence:'active'});}) as typeof fetch;
 assert.deepEqual(await readSlackPresence('fixture-token','admin@example.com',undefined,transport),{userId:'U123',online:true});
 assert.equal(calls[0].searchParams.get('email'),'admin@example.com');assert.equal(calls[1].searchParams.get('user'),'U123');
 calls.length=0;await readSlackPresence('fixture-token','admin@example.com','U123',transport);assert.equal(calls.length,1);
 const mismatched=(async()=>Response.json({ok:true,user:{id:'U999',profile:{email:'someone-else@example.com'}}})) as typeof fetch;
 assert.deepEqual(await readSlackPresence('fixture-token','admin@example.com',undefined,mismatched),{userId:null,online:false});
 await assert.rejects(()=>readSlackPresence('fixture-token','admin@example.com','U123',(async()=>Response.json({ok:false,error:'missing_scope'})) as typeof fetch));
});

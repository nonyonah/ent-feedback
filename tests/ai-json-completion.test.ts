import {test} from 'node:test';
import assert from 'node:assert/strict';

test('AI completion sends bounded JSON requests and validates provider responses',async()=>{
 process.env.DATABASE_URL='postgres://test:test@localhost:5432/test';
 process.env.AI_BASE_URL='https://inference.example/v1';
 process.env.AI_API_KEY='test-key';
 process.env.AI_MODEL='hermes-test';
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async (input,init)=>{
   assert.equal(String(input),'https://inference.example/v1/chat/completions');
   assert.equal(init?.redirect,'error');
   const request=JSON.parse(String(init?.body));
   assert.equal(request.model,'hermes-test');
   assert.equal(request.max_tokens,1024);
   assert.deepEqual(request.response_format,{type:'json_object'});
   return Response.json({choices:[{message:{content:'{"ids":[]}'}}]});
  };
  const {jsonCompletion}=await import('../src/server/ai/json-completion');
  assert.deepEqual(await jsonCompletion('Return JSON',{text:'hello'}),{ids:[]});
  globalThis.fetch=async()=>Response.json({choices:[{message:{content:'invalid json'}}]});
  await assert.rejects(jsonCompletion('Return JSON',{}));
  globalThis.fetch=async()=>new Response('x'.repeat(50001));
  await assert.rejects(jsonCompletion('Return JSON',{}));
 }finally{globalThis.fetch=originalFetch;}
});

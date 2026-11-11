import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runNotificationSchedule} from '../tools/notification-scheduler/src/runner.mjs';
test('scheduler is disabled by default and sends a bounded authenticated POST when enabled',async()=>{
 let calls=0;
 const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input),'https://ent.riftlabs.xyz/api/internal/notification-jobs');assert.equal(init?.method,'POST');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+'s'.repeat(32));assert.equal(init?.redirect,'error');assert.ok(init?.signal);return Response.json({ok:true});};
 assert.deepEqual(await runNotificationSchedule({APP_ORIGIN:'https://ent.riftlabs.xyz',CRON_SECRET:'s'.repeat(32),ENABLED:'false'},transport),{enabled:false});assert.equal(calls,0);
 assert.equal((await runNotificationSchedule({APP_ORIGIN:'https://ent.riftlabs.xyz',CRON_SECRET:'s'.repeat(32),ENABLED:'true'},transport)).status,200);assert.equal(calls,1);
});
test('scheduler rejects unsafe origins, missing secrets, redirects and failed endpoints',async()=>{
 for(const APP_ORIGIN of ['http://example.com','https://user:pass@example.com','https://example.com/private'])await assert.rejects(runNotificationSchedule({APP_ORIGIN,ENABLED:'true',CRON_SECRET:'s'.repeat(32)}));
 await assert.rejects(runNotificationSchedule({APP_ORIGIN:'https://example.com',ENABLED:'true',CRON_SECRET:''}));
 await assert.rejects(runNotificationSchedule({APP_ORIGIN:'https://example.com',ENABLED:'true',CRON_SECRET:'s'.repeat(32)},async()=>new Response(null,{status:503})));
});

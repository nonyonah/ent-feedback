import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchNotificationMaintenance,config} from '../netlify/functions/notification-schedule.mjs';
import {executeNotificationMaintenance} from '../netlify/functions/notification-maintenance.mjs';
const env={URL:'https://ent-boards.netlify.app',CRON_SECRET:'s'.repeat(32)};
test('Netlify dispatches every five minutes to its authenticated background function',async()=>{
 assert.equal(config.schedule,'*/5 * * * *');
 await dispatchNotificationMaintenance(env,async(input,init)=>{assert.equal(String(input),'https://ent-boards.netlify.app/.netlify/functions/notification-maintenance');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+env.CRON_SECRET);assert.equal(init?.redirect,'error');assert.ok(init?.signal);return new Response(null,{status:202});});
 await assert.rejects(dispatchNotificationMaintenance({...env,CRON_SECRET:''}));
 await assert.rejects(dispatchNotificationMaintenance({...env,URL:'https://user:password@example.com'}));
 await assert.rejects(dispatchNotificationMaintenance(env,async()=>new Response(null,{status:503})));
});
test('background worker rejects unauthenticated calls and forwards the cron secret only to the configured app',async()=>{
 let calls=0;
 const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input),'https://ent-boards.netlify.app/api/internal/notification-jobs');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+env.CRON_SECRET);return Response.json({ok:true});};
 assert.deepEqual(await executeNotificationMaintenance(new Request('https://example.com'),env,transport),{authorized:false});assert.equal(calls,0);
 const request=new Request('https://example.com',{headers:{Authorization:'Bearer '+env.CRON_SECRET}});
 assert.deepEqual(await executeNotificationMaintenance(request,env,transport),{enabled:true,status:200});assert.equal(calls,1);
});

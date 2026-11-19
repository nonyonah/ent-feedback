import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync,sign} from 'node:crypto';
import {validLinearSignature,validDiscordSignature,boundedBody,externalRequestId,discordNonce} from '../src/server/connected-apps/security';
import {linearSettingsSchema,linearDestination} from '../src/lib/connected-apps';
test('Linear authenticates raw bodies and rejects forged/stale events',()=>{
 const now=Date.now(),body='{"event":"updated"}',secret='test-secret',signature=createHmac('sha256',secret).update(body).digest('hex');
 assert.ok(validLinearSignature(body,signature,secret,now,now));assert.equal(validLinearSignature(body+' ',signature,secret,now,now),false);assert.equal(validLinearSignature(body,signature,secret,now-60001,now),false);assert.equal(validLinearSignature(body,'bad',secret,now,now),false);
});
test('Discord verifies Ed25519 signatures, timestamp and exact payload',()=>{
 const pair=generateKeyPairSync('ed25519'),key=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex'),now=Date.now(),timestamp=String(Math.floor(now/1000)),body='{"type":1}',signature=sign(null,Buffer.from(timestamp+body),pair.privateKey).toString('hex');
 assert.ok(validDiscordSignature(body,timestamp,signature,key,now));assert.equal(validDiscordSignature(body+' ',timestamp,signature,key,now),false);assert.equal(validDiscordSignature(body,timestamp,signature,key,now+301000),false);assert.equal(validDiscordSignature(body,timestamp,'x',key,now),false);assert.equal(validDiscordSignature(body,timestamp,signature,'bad',now),false);
});
test('Public integration payload reader enforces streamed byte limit',async()=>{
 assert.equal(await boundedBody(new Request('https://ent.test',{method:'POST',body:'hello'}),5),'hello');await assert.rejects(()=>boundedBody(new Request('https://ent.test',{method:'POST',body:'too long'}),2));
});
test('Provider idempotency IDs are stable and namespaced',()=>{
 assert.equal(externalRequestId('a'),externalRequestId('a'));assert.notEqual(externalRequestId('a'),externalRequestId('b'));assert.match(externalRequestId('a'),/^[a-f0-9-]{36}$/);assert.equal(discordNonce('a').length,24);assert.notEqual(discordNonce('a'),discordNonce('b'));
});
test('Linear destinations reject arbitrary hosts and URL credentials',()=>{
 assert.ok(linearDestination('https://linear.app/ent/issue/ENT-1'));for(const url of ['javascript:alert(1)','https://evil.example','https://linear.app.evil.example','https://user@linear.app/issue/1','http://linear.app/issue'])assert.equal(linearDestination(url),null);
});
test('Status mapping requires four distinct provider states',()=>{
 const teamId='11111111-1111-4111-8111-111111111111',id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,states={open:id(1),planned:id(2),'in-progress':id(3),shipped:id(4)};
 assert.ok(linearSettingsSchema.safeParse({teamId,states}).success);assert.equal(linearSettingsSchema.safeParse({teamId,states:{...states,shipped:states.open}}).success,false);
});

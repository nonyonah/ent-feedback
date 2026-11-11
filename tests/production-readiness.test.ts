import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionReadiness} from '../src/lib/production-readiness';
test('production readiness blocks missing services and test origins without exposing values',()=>{
 const secret='private-value-that-must-never-appear';
 const checks=productionReadiness({BACHS_API_KEY:secret,NEXT_PUBLIC_APP_URL:'https://demo.ngrok-free.app'});
 assert.equal(checks.find(check=>check.id==='app-origin')?.status,'blocked');
 assert.equal(checks.find(check=>check.id==='bachs-live')?.status,'blocked');
 assert.equal(JSON.stringify(checks).includes(secret),false);
});
test('permanent HTTPS origins pass; localhost, userinfo and paths do not',()=>{
 for(const origin of ['http://localhost:3000','https://localhost','https://example.com','https://127.0.0.1','https://user:secret@ent.riftlabs.xyz','https://ent.riftlabs.xyz/path'])assert.equal(productionReadiness({NEXT_PUBLIC_APP_URL:origin}).find(check=>check.id==='app-origin')?.status,'blocked',origin);
 assert.equal(productionReadiness({NEXT_PUBLIC_APP_URL:'https://ent.riftlabs.xyz'}).find(check=>check.id==='app-origin')?.status,'pass');
});
test('configuration presence never claims deployment and delivery are verified',()=>{
 assert.deepEqual(productionReadiness({}).filter(check=>check.status==='manual').map(check=>check.id),['provider-verification','scheduler','release-acceptance']);
});

test('release checks reject sandbox email and enabled lifecycle without unsubscribe signing',()=>{
 const sandbox=productionReadiness({SENDBYTE_API_KEY:'sk_test_fixture',EMAIL_FROM:'Ent <team@example.com>'});
 assert.equal(sandbox.find(c=>c.id==='email')?.status,'blocked');
 const live=productionReadiness({SENDBYTE_API_KEY:'sk_live_fixture',EMAIL_FROM:'Ent <team@example.com>',LIFECYCLE_EMAILS_ENABLED:'true'});
 assert.equal(live.find(c=>c.id==='email')?.status,'pass');
 assert.equal(live.find(c=>c.id==='lifecycle-unsubscribe-secret')?.status,'blocked');
});

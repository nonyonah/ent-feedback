import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationOrigin,applicationEmailUrl} from '../src/lib/application-origin';

test('production links cannot inherit a local development origin',()=>{
 for(const origin of [undefined,'http://localhost:3000','http://127.0.0.1:3000','http://[::1]:3000']){
  assert.equal(applicationOrigin(origin,true),'https://ent.riftlabs.xyz');
 }
 assert.equal(applicationOrigin('https://ent.example.com/',true),'https://ent.example.com');
 assert.equal(applicationOrigin('http://localhost:3000',false),'http://localhost:3000');
});

test('previously queued local email links retain path and parameters on production',()=>{
 assert.equal(applicationEmailUrl('http://localhost:3000/p/elf/items/123?reply=456#comments','https://ent.riftlabs.xyz',true),'https://ent.riftlabs.xyz/p/elf/items/123?reply=456#comments');
 assert.equal(applicationEmailUrl('https://example.com/items/123','https://ent.riftlabs.xyz',true),'https://example.com/items/123');
 assert.equal(applicationEmailUrl('http://localhost:3000/items/123','http://localhost:3000',false),'http://localhost:3000/items/123');
});

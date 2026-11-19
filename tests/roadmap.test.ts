import {publicReturnPath} from '../src/lib/auth-flow';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fractionalOrder} from '../src/lib/roadmap';
import {roadmapUnsubscribeToken,readRoadmapUnsubscribe} from '../src/lib/roadmap-unsubscribe';
test('fractional positions preserve neighboring items without reindexing',()=>{assert.equal(fractionalOrder(null,null),0);assert.equal(fractionalOrder(null,2),1);assert.equal(fractionalOrder(2,null),3);assert.equal(fractionalOrder(1,2),1.5);assert.throws(()=>fractionalOrder(2,1));assert.throws(()=>fractionalOrder(1,1));assert.throws(()=>fractionalOrder(Number.MAX_VALUE,Number.MAX_VALUE));});
test('roadmap unsubscribe tokens authenticate the workspace and conceal the address',()=>{const claim={workspaceId:'11111111-1111-4111-8111-111111111111',email:'visitor@example.com'},secret='secret-for-roadmap-testing-32-characters';const token=roadmapUnsubscribeToken(claim,secret);assert.deepEqual(readRoadmapUnsubscribe(token,secret),claim);assert.equal(token.includes('visitor'),false);assert.equal(Buffer.from(token,'base64url').toString().includes(claim.email),false);assert.equal(readRoadmapUnsubscribe(token,'different-secret-for-roadmap-32-chars'),null);const bytes=Buffer.from(token,'base64url');bytes[30]^=1;assert.equal(readRoadmapUnsubscribe(bytes.toString('base64url'),secret),null);assert.equal(readRoadmapUnsubscribe('garbage',secret),null);});

test('public roadmap auth returns to the current workspace roadmap',()=>{for(const path of ['/roadmap','/p/acme/roadmap','/p/acme/roadmap?shipped=all'])assert.equal(publicReturnPath(path),path);});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planEntitlements} from '../src/lib/plan-entitlements';
const now=Date.now(),future=new Date(now+86400000),past=new Date(now-1);
test('Free includes two boards, attribution, and no paid export entitlement',()=>{assert.deepEqual(planEntitlements(null),{plan:'free',boardLimit:2,hideAttribution:false,canExport:false});});
test('paid and trial workspaces receive five boards without attribution',()=>{for(const status of ['active','trialing','past_due'])assert.deepEqual(planEntitlements({status,trialEnd:future,periodEnd:future},now),{plan:'essentials',boardLimit:5,hideAttribution:true,canExport:true});});
test('expired or canceled subscriptions fall back to Free without deleting content',()=>{for(const status of ['active','trialing','canceled','unpaid','paused'])assert.equal(planEntitlements({status,trialEnd:past,periodEnd:past},now).boardLimit,2);});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifiedClassification} from '../src/lib/ai/classification';

test('classification accepts only existing workspace tag IDs and known types',()=>{
 const allowed='00000000-0000-4000-8000-000000000001',foreign='00000000-0000-4000-8000-000000000002';
 assert.deepEqual(verifiedClassification({category:'bug',tagIds:[foreign,allowed,allowed]},new Set([allowed])),{category:'bug',tagIds:[allowed]});
 assert.deepEqual(verifiedClassification({category:'question',tagIds:[]},new Set()),{category:'question',tagIds:[]});
 assert.throws(()=>verifiedClassification({category:'unknown',tagIds:[]},new Set()));
 assert.throws(()=>verifiedClassification({category:'bug',tagIds:[],unexpected:true},new Set()));
});

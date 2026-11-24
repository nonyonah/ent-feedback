import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifiedDuplicateIds} from '../src/lib/ai/semantic-duplicates';
const first='00000000-0000-4000-8000-000000000001',second='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
test('AI duplicate results can only refer to supplied workspace candidates',()=>{
 assert.deepEqual(verifiedDuplicateIds({ids:[second,other,first,second]},new Set([first,second])),[second,first]);
 assert.deepEqual(verifiedDuplicateIds({ids:['not-a-uuid']},new Set([first])),[]);
 assert.deepEqual(verifiedDuplicateIds({ids:[first],extra:'unexpected'},new Set([first])),[]);
});

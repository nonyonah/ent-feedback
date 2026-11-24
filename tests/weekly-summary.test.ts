import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mondayUtc} from '../src/server/ai/weekly-summary';

test('weekly boundary is Monday at midnight UTC',()=>{
 assert.equal(mondayUtc(new Date('2026-11-23T00:00:00Z')).toISOString(),'2026-11-23T00:00:00.000Z');
 assert.equal(mondayUtc(new Date('2026-11-29T23:59:59Z')).toISOString(),'2026-11-23T00:00:00.000Z');
 assert.equal(mondayUtc(new Date('2026-11-30T00:00:00Z')).toISOString(),'2026-11-30T00:00:00.000Z');
});

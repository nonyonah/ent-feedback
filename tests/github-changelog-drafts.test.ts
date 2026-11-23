import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Transaction} from '../src/server/db/client';
import {changelogEntries,githubAppChangelogReceipts} from '../src/server/db/schema';
import {saveGithubChangelogDraft} from '../src/server/connected-apps/github-changelog-drafts';

test('history and webhook share one receipt and preserve the historical merge date',async()=>{
 const receipts=new Set<string>(),entries:Record<string,unknown>[]=[];
 const tx={insert(table:unknown){return {values(value:Record<string,unknown>){return {onConflictDoNothing(){return {async returning(){if(table===githubAppChangelogReceipts){const key=String(value.connectionId)+':'+String(value.pullRequestId);if(receipts.has(key))return [];receipts.add(key);return [{id:value.pullRequestId}];}if(table===changelogEntries){entries.push(value);return [{id:'entry'}];}throw Error('Unexpected table');}};}};}};}} as unknown as Transaction;
 const connection={id:'connection',workspaceId:'workspace',createdByUserId:null};
 const draft={id:'123',number:2,title:'A feature',body:'Details',category:'new-feature' as const,slug:'a-feature'};
 assert.equal(await saveGithubChangelogDraft(tx,connection,draft,'2026-01-01T12:00:00Z'),true);
 assert.equal(await saveGithubChangelogDraft(tx,connection,draft),false);
 assert.equal(entries.length,1);assert.equal(entries[0].status,'draft');assert.equal((entries[0].createdAt as Date).toISOString(),'2026-01-01T12:00:00.000Z');
});

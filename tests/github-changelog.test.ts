import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {githubChangelogBody,githubChangelogDraft,validGithubSignature} from '../src/lib/github-changelog';
const payload={action:'closed',repository:{full_name:'Example/Repo'},pull_request:{id:123,number:7,merged:true,title:'Improve exports',body:'Export data faster.',html_url:'https://github.com/Example/Repo/pull/7',base:{ref:'main'},labels:[{name:'feature'}]}};
test('GitHub signatures use the exact raw body and secret',()=>{const body=JSON.stringify(payload),signature='sha256='+createHmac('sha256','secret').update(body).digest('hex');assert.equal(validGithubSignature(body,signature,'secret'),true);assert.equal(validGithubSignature(body+' ',signature,'secret'),false);assert.equal(validGithubSignature(body,signature,'other'),false);assert.equal(validGithubSignature(body,'sha256=bad','secret'),false);});
test('only merged PRs from the configured repository become private draft data',()=>{const draft=githubChangelogDraft(payload,'example/repo');assert.equal(draft?.title,'Improve exports');assert.equal(draft?.category,'new-feature');assert.equal(githubChangelogDraft(payload,'other/repo'),null);assert.equal(githubChangelogDraft({...payload,action:'opened'},'example/repo'),null);assert.equal(githubChangelogDraft({...payload,pull_request:{...payload.pull_request,merged:false}},'example/repo'),null);assert.equal(githubChangelogDraft({...payload,pull_request:{...payload.pull_request,labels:[{name:'skip-changelog'}]}},'example/repo'),null);});
test('empty PR descriptions remain editable without exposing an empty draft',()=>{const draft=githubChangelogDraft({...payload,pull_request:{...payload.pull_request,body:null,labels:[{name:'bug'}]}},'example/repo');assert.equal(draft?.category,'bug-fix');assert.ok(draft?.body);});
test('dedicated changelog sections are extracted without internal notes or template comments',()=>{
 assert.equal(githubChangelogBody('## Summary\nInternal notes\n\n## Changelog\n<!-- Write for customers -->\n- Export is faster.\n\n## Test plan\nPrivate details'),'- Export is faster.');
 assert.equal(githubChangelogBody('## User-facing changes\n<!-- placeholder -->\n\n## Internal\nsecret'),'Describe the change for your users before publishing.');
 assert.equal(githubChangelogBody('```md\n## Changelog\nexample\n```\n\n## User-facing change\nActual update'),'Actual update');
 assert.equal(githubChangelogBody('Ordinary PR description'),'Ordinary PR description');
});

test('history imports only merged pull requests, preserving the merge date and skip labels',async()=>{
 const {githubHistoricalChangelogDraft}=await import('../src/lib/github-changelog');
 const pr={...payload.pull_request,merged_at:'2026-11-01T12:00:00Z'};
 const draft=githubHistoricalChangelogDraft(pr,'example/repo');assert.equal(draft?.id,'123');assert.equal(draft?.mergedAt,'2026-11-01T12:00:00Z');
 assert.equal(githubHistoricalChangelogDraft({...pr,merged_at:null},'example/repo'),null);
 assert.equal(githubHistoricalChangelogDraft({...pr,labels:[{name:'internal'}]},'example/repo'),null);
 assert.equal(githubHistoricalChangelogDraft({...pr,merged_at:'bad'},'example/repo'),null);
});

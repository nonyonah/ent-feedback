import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workspaceDomainAddress,validNewWorkspaceDomain,normalizeWorkspaceName,validWorkspaceHandle,workspaceHandleFromHost,workspacePublicUrl} from '../src/lib/workspace-domain';
test('workspace names normalize whitespace without changing their display case',()=>{assert.equal(normalizeWorkspaceName('  Acme\t  Feedback \n'),'Acme Feedback');assert.equal(normalizeWorkspaceName('Acme Feedback').toLowerCase(),normalizeWorkspaceName('ACME   FEEDBACK').toLowerCase());});
test('subdomains are DNS labels and exclude infrastructure names',()=>{for(const handle of ['acme','acme-feedback','dobby','a1'])assert.ok(validWorkspaceHandle(handle));for(const handle of ['a','www','api','auth','support','-acme','acme-','acme.team','Acme','a'.repeat(41)])assert.equal(validWorkspaceHandle(handle),false,handle);});
test('tenant resolution accepts exactly one label beneath the configured product domain',()=>{assert.equal(workspaceHandleFromHost('Acme.Feedback.Riftlabs.xyz:3000','feedback.riftlabs.xyz'),'acme');for(const host of ['dobby.riftlabs.xyz','feedback.riftlabs.xyz','acme.feedback.riftlabs.xyz.evil.test','evilacmefeedback.riftlabs.xyz','a.b.feedback.riftlabs.xyz','api.feedback.riftlabs.xyz'])assert.equal(workspaceHandleFromHost(host,'feedback.riftlabs.xyz'),null,host);});
test('public addresses use the product namespace and preserve legacy links before configuration',()=>{const previous=process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;try{delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;assert.equal(workspacePublicUrl('acme','/boards/product','https://app.test'),'https://app.test/p/acme/boards/product');process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN='feedback.riftlabs.xyz';assert.equal(workspacePublicUrl('acme'), 'https://acme.feedback.riftlabs.xyz/');assert.equal(workspacePublicUrl('acme','/boards/product'),'https://acme.feedback.riftlabs.xyz/boards/product');}finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;else process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN=previous;}});

test('new workspace domains need five characters; existing shorter URLs remain routable',()=>{assert.equal(validNewWorkspaceDomain('acme'),false);assert.equal(validNewWorkspaceDomain('acme5'),true);assert.equal(workspaceHandleFromHost('acme.feedback.riftlabs.xyz','feedback.riftlabs.xyz'),'acme');});

test('Share displays the workspace domain before activation and honors the configured base domain',()=>{const previous=process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;try{delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;assert.equal(workspaceDomainAddress('acme-feedback','/boards/product'),'https://acme-feedback.feedback.riftlabs.xyz/boards/product');process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN='boards.example.com';assert.equal(workspaceDomainAddress('acme-feedback','/boards/product'),'https://acme-feedback.boards.example.com/boards/product');}finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;else process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN=previous;}});


test('feedback links open the workspace detail route without a legacy redirect', async()=>{
 const {feedbackHref}=await import('../src/lib/project-links');
 const previous=process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;
 try {
  delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;
  assert.equal(feedbackHref({slug:'acme'},'post/one'),'/p/acme/items/post%2Fone');
  process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN='feedback.riftlabs.xyz';
  assert.equal(feedbackHref({slug:'acme'},'post-1'),'https://acme.feedback.riftlabs.xyz/items/post-1');
 } finally {
  if(previous===undefined)delete process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN;else process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN=previous;
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {needsWorkspaceRegistration} from '../src/lib/registration-state';

test('completed Clerk onboarding cannot skip a missing database workspace',()=>{
  for(const complete of [true,false])for(const hasSetupWorkspace of [true,false]){
    assert.equal(needsWorkspaceRegistration({hasWorkspace:false,complete,hasSetupWorkspace}),true);
  }
});

test('existing workspace members only resume an unfinished setup workspace',()=>{
  assert.equal(needsWorkspaceRegistration({hasWorkspace:true,complete:false,hasSetupWorkspace:true}),true);
  assert.equal(needsWorkspaceRegistration({hasWorkspace:true,complete:false,hasSetupWorkspace:false}),false);
  assert.equal(needsWorkspaceRegistration({hasWorkspace:true,complete:true,hasSetupWorkspace:true}),false);
  assert.equal(needsWorkspaceRegistration({hasWorkspace:true,complete:true,hasSetupWorkspace:false}),false);
});

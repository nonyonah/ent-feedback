import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toAppError,toResponse,ServiceError} from '../src/server/result';
test('unexpected provider/ORM errors do not expose parameters to logs or callers',()=>{
 const error=Object.assign(new Error('query failed: private@example.com token-secret'),{params:['token-secret'],code:'23505'});
 const original=console.error;const logs:unknown[][]=[];console.error=(...args:unknown[])=>{logs.push(args);};
 try{const result=toAppError(error);assert.equal(result.code,'internal');const serialized=JSON.stringify({result,logs});assert.ok(!serialized.includes('token-secret'));assert.ok(!serialized.includes('private@example.com'));assert.ok(serialized.includes('23505'));}finally{console.error=original;}
});
test('API results prevent shared caching of workspace or user data',async()=>{
 const success=toResponse({ok:true,data:{privateWorkspace:'fixture'}});assert.equal(success.headers.get('cache-control'),'private, no-store');
 const denied=toResponse({ok:false,error:toAppError(new ServiceError('forbidden','Denied'))});assert.equal(denied.status,403);assert.equal(denied.headers.get('cache-control'),'private, no-store');
});

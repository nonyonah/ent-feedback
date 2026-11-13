import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visitorToken,rememberVisitorToken} from '../src/lib/visitor-token';

// The browser presents one token per workspace so that parallel first loads
// resolve to a single guest identity instead of creating one per request.

type Storage=Map<string,string>;

function withStorage(storage:Storage,run:()=>void):void{
 const globalRef=globalThis as unknown as{window?:unknown;localStorage?:unknown};
 const previousWindow=globalRef.window;
 const previousStorage=globalRef.localStorage;
 const localStorage={
  getItem:(key:string)=>storage.get(key)??null,
  setItem:(key:string,value:string)=>{storage.set(key,String(value));},
 };
 globalRef.window={localStorage} as unknown;
 globalRef.localStorage=localStorage;
 try{run();}finally{
  globalRef.window=previousWindow;
  globalRef.localStorage=previousStorage;
 }
}

test('a workspace without a stored token receives one generated token',()=>{
 const storage=new Map<string,string>();
 withStorage(storage,()=>{
  const token=visitorToken('generated-one');
  assert.match(token,/^[a-f0-9]{64}$/);
  // Repeated reads return the same token, so parallel requests agree.
  assert.equal(visitorToken('generated-one'),token);
  assert.equal(storage.get('ent-visitor:generated-one'),token);
 });
});

test('workspaces never share a visitor token',()=>{
 const storage=new Map<string,string>();
 withStorage(storage,()=>{
  const first=visitorToken('shared-a');
  const second=visitorToken('shared-b');
  assert.notEqual(first,second);
  assert.equal(storage.get('ent-visitor:shared-a'),first);
  assert.equal(storage.get('ent-visitor:shared-b'),second);
 });
});

test('a stored token is reused instead of regenerated',()=>{
 const storage=new Map<string,string>();
 const existing='a'.repeat(64);
 storage.set('ent-visitor:stored-one',existing);
 withStorage(storage,()=>{
  assert.equal(visitorToken('stored-one'),existing);
 });
});

test('an invalid stored token is replaced',()=>{
 const storage=new Map<string,string>();
 storage.set('ent-visitor:invalid-one','not-a-token');
 withStorage(storage,()=>{
  const token=visitorToken('invalid-one');
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.equal(storage.get('ent-visitor:invalid-one'),token);
 });
});

test('a token returned by the server replaces the local one',()=>{
 const storage=new Map<string,string>();
 withStorage(storage,()=>{
  const original=visitorToken('server-one');
  const serverToken='b'.repeat(64);
  rememberVisitorToken('server-one',serverToken);
  assert.equal(visitorToken('server-one'),serverToken);
  assert.equal(storage.get('ent-visitor:server-one'),serverToken);
  assert.notEqual(original,serverToken);
 });
});

test('a malformed server token is ignored',()=>{
 const storage=new Map<string,string>();
 withStorage(storage,()=>{
  const token=visitorToken('malformed-one');
  rememberVisitorToken('malformed-one','short');
  assert.equal(visitorToken('malformed-one'),token);
  rememberVisitorToken('malformed-one',undefined);
  assert.equal(visitorToken('malformed-one'),token);
 });
});

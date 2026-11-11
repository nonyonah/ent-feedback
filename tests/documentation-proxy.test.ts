import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentationPath,documentationOrigin,documentationDestination,documentationRequestHeaders} from '../src/lib/documentation-proxy';
test('documentation routes include subpath, shared assets and legacy search endpoint only',()=>{
 for(const path of ['/docs','/docs/widget/install','/_mintlify/assets/a.js','/mintlify-assets/logo.png','/api/request'])assert.equal(documentationPath(path),true);
 for(const path of ['/dashboard','/docs-private','/api/webhooks/bachs','/api/request-private','/_next/static/a.js'])assert.equal(documentationPath(path),false);
});
test('Mintlify upstream is a fixed HTTPS project origin',()=>{
 assert.equal(documentationOrigin('https://ent-test.mintlify.site'),'https://ent-test.mintlify.site');
 for(const value of ['http://ent.mintlify.site','https://ent.mintlify.site.evil.test','https://evil.test','https://user:pass@ent.mintlify.site','https://ent.mintlify.site/docs','https://ent.mintlify.site?x=1','https://ent.mintlify.site#x'])assert.equal(documentationOrigin(value),null,value);
});
test('documentation destination preserves base path and query and maps legacy API',()=>{
 assert.equal(documentationDestination('/docs/widget/install','?q=widget','https://ent-test.mintlify.site').href,'https://ent-test.mintlify.site/docs/widget/install?q=widget');
 assert.equal(documentationDestination('/api/request','','https://ent-test.mintlify.site').pathname,'/_mintlify/api/request');
 assert.throws(()=>documentationDestination('/dashboard','','https://ent-test.mintlify.site'));
});
test('docs proxy strips application secrets, cookies and spoofed forwarded headers',()=>{
 const headers=documentationRequestHeaders(new Headers({cookie:'session=private',authorization:'Bearer private','x-clerk-auth-token':'private',host:'ent.riftlabs.xyz','x-forwarded-host':'evil.test','x-forwarded-for':'evil',origin:'https://evil.test','content-type':'application/json',accept:'text/html'}),'https://ent-test.mintlify.site');
 for(const name of ['cookie','authorization','x-clerk-auth-token','host','x-forwarded-host','x-forwarded-for'])assert.equal(headers.get(name),null);
 assert.equal(headers.get('origin'),'https://ent-test.mintlify.site');assert.equal(headers.get('content-type'),'application/json');
});

test('actual Next proxy rewrites public docs before Clerk with sanitized request overrides',async()=>{
 const {execFileSync}=await import('node:child_process');
 execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`
 const {NextRequest}=await import('next/server');
 const assert=(await import('node:assert/strict')).default;
 const module=await import('./src/proxy.ts');
 const proxy=typeof module.default==='function'?module.default:module.default.default;
 const previous=process.env.MINTLIFY_ORIGIN;
 try{
  process.env.MINTLIFY_ORIGIN='https://ent-test.mintlify.site';
  const request=new NextRequest('https://ent.riftlabs.xyz/docs/widget/install?q=example',{headers:{cookie:'session=private',authorization:'Bearer private',accept:'text/html'}});
  const response=await proxy(request,{});
  assert.ok(response);
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://ent-test.mintlify.site/docs/widget/install?q=example');
  const forwarded=response.headers.get('x-middleware-override-headers')?.split(',')??[];
  assert.ok(forwarded.includes('origin'));assert.ok(!forwarded.includes('cookie'));assert.ok(!forwarded.includes('authorization'));
  assert.equal(response.headers.get('x-middleware-request-origin'),'https://ent-test.mintlify.site');
 }finally{if(previous===undefined)delete process.env.MINTLIFY_ORIGIN;else process.env.MINTLIFY_ORIGIN=previous;}
 `],{env:{...process.env,NODE_OPTIONS:''},stdio:'pipe'});
});

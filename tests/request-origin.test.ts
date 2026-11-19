import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSameOriginRequest} from '../src/lib/request-origin';
function request(origin:string|null,host:string|null,forwarded?:string){
 const headers=new Headers();
 if(origin)headers.set('origin',origin);
 if(host)headers.set('host',host);
 if(forwarded)headers.set('x-forwarded-host',forwarded);
 return new Request('http://internal:3000/api/admin/items/item/roadmap',{method:'PATCH',headers});
}
test('same-origin requests pass when the proxy host differs from the request URL',()=>{
 assert.equal(isSameOriginRequest(request('https://feedback.example.com','internal:3000','feedback.example.com')),true);
 assert.equal(isSameOriginRequest(request('https://feedback.example.com','feedback.example.com')),true);
 assert.equal(isSameOriginRequest(request('http://localhost:3000','localhost:3000')),true);
 assert.equal(isSameOriginRequest(request('https://feedback.example.com','feedback.example.com:443')),true);
});
test('forwarded hosts with multiple hops use the public host',()=>{
 assert.equal(isSameOriginRequest(request('https://feedback.example.com','internal:3000','feedback.example.com, proxy.internal')),true);
});
test('cross-origin, missing and malformed origins are rejected',()=>{
 assert.equal(isSameOriginRequest(request('https://attacker.example','feedback.example.com')),false);
 assert.equal(isSameOriginRequest(request(null,'feedback.example.com')),false);
 assert.equal(isSameOriginRequest(request('not a url','feedback.example.com')),false);
 assert.equal(isSameOriginRequest(request('https://feedback.example.com',null)),false);
});

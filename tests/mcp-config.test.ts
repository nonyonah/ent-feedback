import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mcpAuthOptions} from '../src/server/mcp/config';

test('MCP stays unavailable until a safe exact resource URL is configured',()=>{
 const original=process.env.MCP_RESOURCE_URL;
 try{
  delete process.env.MCP_RESOURCE_URL;assert.equal(mcpAuthOptions(),null);
  for(const url of ['http://example.com/mcp','https://example.com/other','https://user:pass@example.com/mcp','https://example.com/mcp?key=x']){process.env.MCP_RESOURCE_URL=url;assert.equal(mcpAuthOptions(),null);}
  process.env.MCP_RESOURCE_URL='https://ent.example/mcp';assert.deepEqual(mcpAuthOptions(),{resourceUrl:'https://ent.example/mcp',requiredScopes:['profile'],discoverable:false});
 }finally{if(original===undefined)delete process.env.MCP_RESOURCE_URL;else process.env.MCP_RESOURCE_URL=original;}
});

test('MCP endpoint fails closed when it is not configured',async()=>{
 const original=process.env.MCP_RESOURCE_URL;delete process.env.MCP_RESOURCE_URL;
 try{const {POST}=await import('../src/app/mcp/route');const response=await POST(new Request('https://ent.example/mcp',{method:'POST'}));assert.equal(response.status,503);}finally{if(original!==undefined)process.env.MCP_RESOURCE_URL=original;}
});

test('configured MCP endpoint challenges unauthenticated clients',async()=>{
 const original=process.env.MCP_RESOURCE_URL;process.env.MCP_RESOURCE_URL='https://ent.example/mcp';
 try{const {POST}=await import('../src/app/mcp/route');const response=await POST(new Request('https://ent.example/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}})}));assert.equal(response.status,401);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('WWW-Authenticate')??'',/resource_metadata/);}finally{if(original===undefined)delete process.env.MCP_RESOURCE_URL;else process.env.MCP_RESOURCE_URL=original;}
});

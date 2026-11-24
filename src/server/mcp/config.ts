import 'server-only';
import type {McpAuthOptions} from '@clerk/mcp-tools/next';

export function mcpAuthOptions():McpAuthOptions|null{
 const value=process.env.MCP_RESOURCE_URL;if(!value)return null;
 try{const url=new URL(value);if(url.username||url.password||url.search||url.hash||url.pathname!=='/mcp'||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))return null;return {resourceUrl:url.href,requiredScopes:['profile'],discoverable:false};}catch{return null;}
}

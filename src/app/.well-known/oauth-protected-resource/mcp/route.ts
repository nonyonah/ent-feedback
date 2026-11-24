import {metadataCorsHandler,protectedResourceMetadataHandler} from '@clerk/mcp-tools/next';
import {mcpAuthOptions} from '@/server/mcp/config';
export function GET(request:Request){const options=mcpAuthOptions();return options?protectedResourceMetadataHandler(options)(request):new Response('MCP is not configured.',{status:503});}
export const OPTIONS=metadataCorsHandler();

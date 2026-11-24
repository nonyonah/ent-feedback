import {authorizationServerMetadataHandler,metadataCorsHandler} from '@clerk/mcp-tools/next';
export const GET=authorizationServerMetadataHandler();
export const OPTIONS=metadataCorsHandler();

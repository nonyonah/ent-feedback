import 'server-only';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import type {ConnectedProvider} from '@/lib/connected-apps';
export function appEnabled(provider:ConnectedProvider){const env=getServerEnv();return provider==='linear'?env.LINEAR_ENABLED==='true':env.DISCORD_ENABLED==='true';}
export function requireAppEnabled(provider:ConnectedProvider){if(!appEnabled(provider))throw new ServiceError('forbidden','This integration is coming soon.');}
export function appConfig(provider:ConnectedProvider){
 requireAppEnabled(provider);const e=getServerEnv();const id=provider==='linear'?e.LINEAR_CLIENT_ID:e.DISCORD_CLIENT_ID,secret=provider==='linear'?e.LINEAR_CLIENT_SECRET:e.DISCORD_CLIENT_SECRET,key=e.INTEGRATION_ENCRYPTION_KEY;
 if(!id||!secret||!key||Buffer.from(key,'base64').length!==32||(provider==='linear'?!e.LINEAR_WEBHOOK_SECRET:!e.DISCORD_PUBLIC_KEY||!e.DISCORD_BOT_TOKEN))throw new ServiceError('validation','This integration needs server configuration.');
 return {id,secret,key,redirectUri:new URL(`/api/integrations/${provider}/callback`,e.NEXT_PUBLIC_APP_URL).href};
}
export async function appFetch(url:string,init:RequestInit={}){
 try{const r=await fetch(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();return r;}catch{throw new ServiceError('retryable','The integration could not confirm the request. Please try again.');}
}

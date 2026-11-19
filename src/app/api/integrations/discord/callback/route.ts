import {appOAuthCallback} from '@/server/connected-apps/oauth';
export async function GET(request:Request){return appOAuthCallback('discord',request);}

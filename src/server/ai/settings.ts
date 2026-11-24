import 'server-only';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaceAiSettings} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {features} from '@/lib/features';

export function aiProviderConfigured(){if(!features.feedbackAi)return false;const env=getServerEnv();try{return Boolean(env.AI_API_KEY&&env.AI_MODEL&&env.AI_BASE_URL&&new URL(env.AI_BASE_URL).protocol==='https:');}catch{return false;}}
export async function readWorkspaceAiSettings(workspaceId:string){
 const [row]=await getDb().select({feedbackEnabled:workspaceAiSettings.feedbackEnabled,githubEnabled:workspaceAiSettings.githubEnabled}).from(workspaceAiSettings).where(eq(workspaceAiSettings.workspaceId,workspaceId));
 return row??{feedbackEnabled:false,githubEnabled:false};
}

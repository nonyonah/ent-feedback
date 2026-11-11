// Run from a server scheduler. --check is read-only and sends no email.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { config } from 'dotenv';
import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const output=join(mkdtempSync(join(tmpdir(),'ent-maintenance-')),'worker.cjs');
const entry=`import {getDb,closeDb} from './src/server/db/client';import {jobs} from './src/server/db/schema';import {sql} from 'drizzle-orm';import {getServerEnv} from './src/server/env';import {enqueueLifecycleEmails,processLifecycleEmails} from './src/server/lifecycle-email-worker';import {processNotificationJobs} from './src/server/notification-worker';import {cleanExpiredAttachments} from './src/server/attachment-cleanup';export async function run(check){try{if(check){const env=getServerEnv();const counts=await getDb().select({status:jobs.status,count:sql\`count(*)::int\`}).from(jobs).groupBy(jobs.status);return {emailConfigured:Boolean(env.SENDBYTE_API_KEY&&env.EMAIL_FROM),schedulerSecretConfigured:Boolean(env.CRON_SECRET),jobs:counts};}return {notifications:await processNotificationJobs(),lifecycleQueue:await enqueueLifecycleEmails(),lifecycle:await processLifecycleEmails(),cleanup:await cleanExpiredAttachments()};}finally{await closeDb();}}`;
await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'server-marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
try{console.log(JSON.stringify(await createRequire(import.meta.url)(output).run(process.argv.includes('--check'))));}catch{console.error('Maintenance failed. Check database/provider connectivity and server configuration.');process.exitCode=1;}

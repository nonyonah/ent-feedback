// Runs migrations and tests inside one rolled-back transaction on the pooled endpoint.
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';import {sql} from 'drizzle-orm';import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const name='ent_reminder_test_'+randomUUID().replaceAll('-','');global.chatTestSchema=name;global.emailCalls=[];
global.chatEnv={DATABASE_URL:process.env.DATABASE_URL,SENDBYTE_API_KEY:'fixture',EMAIL_FROM:'fixture@example.com',NEXT_PUBLIC_APP_URL:'https://ent.test'};
const output=join(mkdtempSync(join(tmpdir(),'ent-reminder-check-')),'check.cjs');
await esbuild.build({entryPoints:['tests/billing/reminders.ts'],bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'isolated-boundaries',setup(b){
 b.onLoad({filter:/src\/server\/db\/schema\.ts$/},a=>({loader:'ts',resolveDir:process.cwd()+'/src/server/db',contents:readFileSync(a.path,'utf8').replace('new PgSchema("public")','new PgSchema(global.chatTestSchema)')}));
 b.onResolve({filter:/^(server-only|@\/server\/(db\/client|email|env)|\.\/client)$/},a=>{if(a.path==='./client'&&!a.importer.includes('/billing/'))return;return {path:a.path,namespace:'mock'};});
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'js',contents:a.path==='server-only'?'':a.path==='./client'?`export const billingProduct=()=> 'prod_fixture';export const bachsClient=()=>({subscriptions:{get:async()=>global.trialProvider}});`:a.path.endsWith('/email')?`export async function sendTrialEmail(input){global.emailCalls.push(input);}export async function sendPrepaidReminderEmail(input){if(global.chatEmailFail)throw Error('Mock provider unavailable');global.emailCalls.push(input);}`:a.path.endsWith('/env')?`export const getServerEnv=()=>global.chatEnv;`:`export const getDb=()=>global.chatDb;`}));
}}]});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:15000});const rollback=Error('fixture rollback');let passed=false;
try{await drizzle(pool).transaction(async tx=>{
 await tx.execute(sql.raw('create schema '+name));await tx.execute(sql.raw('set local search_path to '+name));global.chatDb=tx;
 for(const file of readdirSync('drizzle').filter(f=>/^\d+.*\.sql$/.test(f)).sort())await tx.execute(sql.raw(readFileSync('drizzle/'+file,'utf8').replaceAll('"public".',`"${name}".`).replaceAll('--> statement-breakpoint','')));
 await createRequire(import.meta.url)(output).run();passed=true;throw rollback;
});}catch(error){if(error!==rollback){console.error('Reminder DB checks failed:',error.cause?.message??error.message);process.exitCode=1;}}finally{await pool.end();}
if(passed)console.log('Temporary schema and all fixtures rolled back. No live emails or billing requests sent.');

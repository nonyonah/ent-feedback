// Explicitly sends one email; never included in automated test commands.
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { config } from 'dotenv';
import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const recipient=process.argv[process.argv.indexOf('--to')+1];
if(!process.argv.includes('--to')||!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw Error('An explicit --to email address is required. This command sends email.');
const output=join(mkdtempSync(join(tmpdir(),'ent-email-smoke-')),'email.cjs');
await esbuild.build({entryPoints:['src/server/email.ts'],bundle:true,platform:'node',format:'cjs',outfile:output,plugins:[{name:'server-marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
const {sendActivityEmail}=createRequire(import.meta.url)(output);
try{
 await sendActivityEmail({to:recipient,subject:'Ent · Sendbyte delivery test',title:'This is the single test email requested while setting up Ent. If you can read this, the message reached your inbox.',url:process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000',key:'ent-delivery-test:'+createHash('sha256').update(recipient).digest('hex')});
 console.log('Sendbyte accepted the test email. Inbox delivery still needs recipient confirmation.');
}catch{console.error('Sendbyte did not confirm acceptance. No credentials or provider response details were logged.');process.exitCode=1;}

// Explicitly sends one email; never included in automated test commands.
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { config } from 'dotenv';
import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const sandbox=Boolean(process.env.SENDBYTE_API_KEY?.startsWith('sk_test_'));
if(sandbox&&!process.argv.includes('--allow-sandbox')){
 console.error('Sandbox key detected. Sendbyte simulates success but delivers no email. Configure an sk_live_ key and a verified sender domain for this test.');
 process.exit(1);
}
const recipient=process.argv[process.argv.indexOf('--to')+1];
if(!process.argv.includes('--to')||!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw Error('An explicit --to email address is required. This command sends email.');
const output=join(mkdtempSync(join(tmpdir(),'ent-email-smoke-')),'email.cjs');
await esbuild.build({entryPoints:['src/server/email.ts'],bundle:true,platform:'node',format:'cjs',outfile:output,plugins:[{name:'server-marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
const {sendActivityEmail}=createRequire(import.meta.url)(output);
const reply=process.argv.includes('--reply');
// Print only delivery evidence, never credentials or provider response bodies.
const transport=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const response=await transport(...args);
 let id;try{const receipt=await response.clone().json();if(typeof receipt?.id==='string')id=receipt.id;}catch{}
 console.log(JSON.stringify({provider:'sendbyte',status:response.status,...(id?{messageId:id}:{})}));
 return response;
};
try{
 await sendActivityEmail({to:recipient,subject:reply?'Ent Feedback · Test reply notification':'Ent Feedback · Delivery test',title:reply?'Test reply: Thanks for sharing your feedback. This is the reply-notification email you requested to check delivery. No real feedback conversation was changed.':'This is the single test email you requested to check delivery.',url:process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000',key:'ent-delivery-test:'+randomUUID()});
 console.log(sandbox?'Sendbyte accepted the sandbox simulation. Check its dashboard event timeline; no inbox delivery occurs.':'Sendbyte accepted the test email. Inbox delivery still needs recipient confirmation.');
}catch{console.error('Sendbyte did not confirm acceptance. No credentials or provider response details were logged.');process.exitCode=1;}

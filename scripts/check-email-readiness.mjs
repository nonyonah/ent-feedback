// Read-only provider check. Never sends mail or prints credentials/provider bodies.
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
const key=process.env.SENDBYTE_API_KEY,from=process.env.EMAIL_FROM;
const mode=key?.startsWith('sk_live_')?'live':key?.startsWith('sk_test_')?'sandbox':'missing-or-unrecognized';
const senderDomain=from?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
if(mode!=='live'){
 console.log(JSON.stringify({mode,senderConfigured:Boolean(from),inboxDeliveryPossible:false,reason:mode==='sandbox'?'Sandbox simulates delivery; no real inbox mail.':'Configure a Sendbyte live key.'}));
 process.exitCode=1;
}else if(!senderDomain){console.error('EMAIL_FROM must contain a sender address.');process.exitCode=1;}
else try{
 const response=await fetch('https://api.sendbyte.africa/v1/domains',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Provider check failed');
 const body=await response.json();const rows=Array.isArray(body.data)?body.data:Array.isArray(body)?body:Array.isArray(body.data?.domains)?body.data.domains:[];
 const domain=rows.find(item=>(item.domain??item.name)?.toLowerCase()===senderDomain);
 const verified=domain?.status==='verified'||domain?.verified===true;
 console.log(JSON.stringify({mode,senderDomain,domainStatus:domain?.status??'not-registered',inboxDeliveryPossible:verified,reason:verified?'Sender verified; delivery still requires a real message and recipient confirmation.':'Verify this exact sender domain or use an already verified domain.'}));
 if(!verified)process.exitCode=1;
}catch{console.error('Could not verify email readiness. Check provider access/connectivity. No email sent.');process.exitCode=1;}

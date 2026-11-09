// Read catalog details by default. --create explicitly creates four versioned products.
import {config} from 'dotenv';
import {Bachs} from '@bachs/sdk';
config({path:'.env.local',quiet:true});
const key=process.env.BACHS_API_KEY;
if(!key||!/^sk_(sandbox|live)_/.test(key)){console.error('Add a Bachs sandbox API key as BACHS_API_KEY in .env.local.');process.exit(1);}
const client=new Bachs({apiKey:key,timeoutMs:15000,logLevel:'off'});
const base=client.environment==='sandbox'?'https://sandbox-api.bachs.io':'https://api.bachs.io';
const arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;};
try{
 if(process.argv.includes('--create')||process.argv.includes('--create-returning')){
  if(client.environment!=='sandbox')throw Error('Catalog setup requires sandbox mode');
  for(const interval of ['monthly','yearly'])for(const trial of (process.argv.includes('--create-returning')?[false]:[true,false])){
   const response=await fetch(base+'/v1/products',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':`ent-essentials-v1-${interval}-${trial?'trial':'returning'}`},body:JSON.stringify({name:`Ent Essentials ${interval}${trial?' · 14-day trial':''}`,price:{price_type:'fixed',amount:interval==='monthly'?'7.00':'70.00',currency:'USD'},billing_cycle:{interval:interval==='monthly'?'month':'year',frequency:1},...(trial?{trial_period:{interval:'day',frequency:14}}:{})})});
   if(!response.ok)throw Error('Catalog creation failed with HTTP '+response.status);
   const result=await response.json();if(typeof result.id!=='string'||!result.id.startsWith('prod_'))throw Error('Unexpected catalog response');
   console.log(`BACHS_${interval==='monthly'?'MONTHLY':'YEARLY'}_${trial?'TRIAL_':''}PRODUCT_ID=${result.id}`);
  }
 }else{
  for(const [label,id]of [['monthly',arg('--monthly')||process.env.BACHS_MONTHLY_TRIAL_PRODUCT_ID],['yearly',arg('--yearly')||process.env.BACHS_YEARLY_TRIAL_PRODUCT_ID]]){
   if(!id){console.log(label+': product ID not configured');continue;}
   const p=await client.products.get(id);console.log(JSON.stringify({interval:label,id:p.id,name:p.name,price:p.price,billingCycle:p.billing_cycle,trialPeriod:p.trial_period??null,organization:p.organization_id??null,archived:Boolean(p.archived_at)}));
  }
 }
}catch{console.error('Bachs catalog request failed. Check API permissions, product IDs, and the sandbox/live environment. No credentials were logged.');process.exitCode=1;}
